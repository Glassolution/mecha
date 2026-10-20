"""O garimpo: busca cada palavra em cada fonte, grava na biblioteca e conta tudo ao vivo.

Regras (faro-original.md seção 5): cache de 7 dias por palavra, cada palavra só no idioma dela,
Parar conferido antes de cada palavra, ritmo de uma pessoa, erro de uma fonte fica só nela,
escrita não latina fica de fora.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

import httpx

from radar import db
from radar.armazenamento import copiar_capa
from radar.biblioteca import SELECT_VIDEO, cartao, gravar_video
from radar.coleta.base import Coletor, ErroFonte, Parado
from radar.coleta.regras import escrita_nao_latina, idiomas_do_termo
from radar.config import config
from radar.fluxo import publicar
from radar.nichos import EQUIVALENTE_EN

log = logging.getLogger(__name__)

FONTES = {
    "tiktok": {"nome": "TikTok", "aberta": True},
    "youtube": {"nome": "YouTube Shorts", "aberta": False, "motivo": "Chega antes do lançamento."},
    "tiktok_ads": {"nome": "TikTok Ads", "aberta": False, "motivo": "Precisa da extensão do Chrome (em breve)."},
    "meta_ads": {"nome": "Facebook e Instagram Ads", "aberta": False, "motivo": "Chega na fase 2."},
    "instagram": {"nome": "Instagram Reels", "aberta": True},
}
FINAIS = {"pronto", "erro", "parado", "trancada"}
CACHE_DIAS = 7


async def _status(garimpo_id: str) -> str | None:
    g = await db.um("select status from garimpos where id = %s", (garimpo_id,))
    return g["status"] if g else None


async def _fonte(garimpo_id: str, fonte: str, **campos) -> dict:
    """Atualiza a etiqueta de uma fonte e manda o evento 'fonte'."""
    g = await db.um(
        """update garimpos set por_fonte = jsonb_set(por_fonte, %s, coalesce(por_fonte->%s, '{}') || %s::jsonb)
           where id = %s returning por_fonte->%s as f""",
        ([fonte], fonte, json.dumps(campos), garimpo_id, fonte),
    )
    estado = {"fonte": fonte, **(g["f"] if g else campos)}
    await publicar(garimpo_id, "fonte", estado)
    return estado


async def _agora(garimpo_id: str, texto: str) -> None:
    await db.executar("update garimpos set agora = %s where id = %s", (texto, garimpo_id))
    await publicar(garimpo_id, "agora", {"texto": texto})


async def _contagens(garimpo_id: str) -> dict:
    c = await db.um(
        """update garimpos g set
             vistos = (select count(*) from garimpo_videos gv where gv.garimpo_id = g.id),
             transcritos = (select count(*) from garimpo_videos gv join videos v on v.id = gv.video_id
                            where gv.garimpo_id = g.id and v.transcricao is not null)
           where id = %s
           returning vistos, transcritos, com_saas, ideias_novas, custo_usd""",
        (garimpo_id,),
    )
    await publicar(garimpo_id, "contagens", c)
    return c


async def _do_cache(termo: str, fonte: str, idioma: str) -> list[str] | None:
    r = await db.um(
        """select video_ids from busca_cache where termo = %s and fonte = %s and idioma = %s
           and buscado_em > now() - make_interval(days => %s)""",
        (termo, fonte, idioma, CACHE_DIAS),
    )
    return r["video_ids"] if r else None


async def _ligar(garimpo_id: str, ids: list[str], termo: str) -> list[dict]:
    """Liga os vídeos ao garimpo e devolve os cartões dos que chegaram agora."""
    if not ids:
        return []
    async with db.conexao() as con:
        cur = await con.execute(
            """insert into garimpo_videos (garimpo_id, video_id, termo)
               select %s, unnest(%s::text[]), %s on conflict do nothing returning video_id""",
            (garimpo_id, ids, termo),
        )
        chegaram = [r["video_id"] for r in await cur.fetchall()]
    if not chegaram:
        return []
    linhas = await db.todos(SELECT_VIDEO + " where v.id = any(%s)", (chegaram,))
    por_id = {r["id"]: r for r in linhas}
    return [cartao(por_id[i]) for i in chegaram if i in por_id]


_ONDE = {"tiktok": "no TikTok", "instagram": "no Instagram"}


def _aceito(v, fonte: str, garimpo: dict) -> bool:
    """Filtros de cada vídeo: escrita latina, idioma do garimpo e, no Instagram, nada velho demais."""
    if escrita_nao_latina(v.texto) or (v.idioma is not None and v.idioma not in garimpo["idiomas"]):
        return False
    if fonte == "instagram" and v.publicado is not None:
        return v.publicado >= datetime.now(timezone.utc) - timedelta(days=config().instagram_max_dias)
    return True


async def _buscar_fonte(garimpo: dict, fonte: str, coletor: Coletor, cli: httpx.AsyncClient) -> None:
    gid = str(garimpo["id"])
    deve_parar = lambda: _parado(gid)  # noqa: E731
    novos_total = 0
    for termo in garimpo["termos"]:
        for busca, idioma in _buscas(termo, garimpo):
            if await deve_parar():
                raise Parado()
            onde = "em inglês" if busca != termo else _ONDE.get(fonte, "")
            await _fonte(gid, fonte, status="buscando", termo=termo, novos=novos_total)
            await _agora(gid, f"Buscando “{termo}” {onde}".strip())
            ids = await _do_cache(busca, fonte, idioma)
            if ids is None:
                resultado = await coletor.buscar(busca, idioma, config().resultados_por_busca, deve_parar)
                aceitos = [v for v in resultado.videos if _aceito(v, fonte, garimpo)]
                await _agora(gid, f"Guardando {len(aceitos)} vídeos de “{termo}”")
                capas = await asyncio.gather(*(copiar_capa(cli, v.id, v.capa_origem) if v.capa_origem else _nada()
                                               for v in aceitos))
                async with db.conexao() as con:
                    for v, capa in zip(aceitos, capas):
                        if v.idioma is None:
                            v.idioma = idioma
                        await gravar_video(con, v, termo)
                        if capa:
                            await con.execute("update videos set capa_path = %s where id = %s", (capa, v.id))
                    ids = [v.id for v in aceitos]
                    await con.execute(
                        """insert into busca_cache (termo, fonte, idioma, buscado_em, video_ids) values (%s, %s, %s, now(), %s)
                           on conflict (termo, fonte, idioma) do update set buscado_em = now(), video_ids = excluded.video_ids""",
                        (busca, fonte, idioma, ids),
                    )
                    await con.execute("update garimpos set custo_usd = custo_usd + %s where id = %s",
                                      (resultado.custo_usd, gid))
            cartoes = await _ligar(gid, ids, termo)
            novos_total += len(cartoes)
            if cartoes:
                await publicar(gid, "chegou", {"videos": cartoes})
            await _contagens(gid)
    await _fonte(gid, fonte, status="pronto", termo=None, novos=novos_total)


def _buscas(termo: str, garimpo: dict) -> list[tuple[str, str]]:
    """O que buscar para uma palavra: ela no idioma dela e, se o garimpo inclui inglês,
    o equivalente em inglês das sugestões em português (a tela continua mostrando só o português)."""
    buscas = [(termo, i) for i in idiomas_do_termo(termo, garimpo["termos_idioma"], garimpo["idiomas"])]
    en = EQUIVALENTE_EN.get(termo)
    if en and "en" in garimpo["idiomas"] and (en, "en") not in buscas:
        buscas.append((en, "en"))
    return buscas


async def _nada():
    return None


async def _parado(garimpo_id: str) -> bool:
    return await _status(garimpo_id) in ("parado", None)


async def rodar(garimpo_id: str, coletores: dict[str, Coletor]) -> None:
    """Roda o garimpo inteiro, uma fonte depois da outra. Idempotente: garimpo já concluído ou parado não roda de novo.

    `coletores` tem um provedor por fonte aberta ({"tiktok": …, "instagram": …}); fonte sem provedor dá erro só nela.
    """
    gid = str(garimpo_id)
    g = await db.um("select * from garimpos where id = %s", (gid,))
    if not g or g["status"] in ("concluido", "parado", "erro"):
        return
    await db.executar("update garimpos set status = 'garimpando' where id = %s", (gid,))
    await publicar(gid, "status", {"status": "garimpando"})

    for fonte in g["fontes"]:
        if not FONTES.get(fonte, {}).get("aberta"):
            await _fonte(gid, fonte, status="trancada", detalhe=FONTES.get(fonte, {}).get("motivo", "Indisponível."))

    erros = 0
    async with httpx.AsyncClient(timeout=20) as cli:
        for fonte in [f for f in g["fontes"] if FONTES.get(f, {}).get("aberta")]:
            if await _parado(gid):
                break
            nome = FONTES[fonte]["nome"]
            try:
                coletor = coletores.get(fonte)
                if coletor is None:
                    raise ErroFonte(f"O {nome} ainda não foi conectado ao servidor.")
                await _buscar_fonte(g, fonte, coletor, cli)
            except Parado:
                break
            except ErroFonte as e:
                erros += 1
                await _fonte(gid, fonte, status="erro", detalhe=e.motivo)
            except Exception:
                erros += 1
                log.exception("garimpo %s: falha no %s", gid, fonte)
                await _fonte(gid, fonte, status="erro", detalhe="Algo deu errado nesta busca. Tente de novo em 1 minuto.")

    status = await _status(gid)
    if status == "parado":
        return  # a rota de parar já mandou o fim
    abertas = [f for f in g["fontes"] if FONTES.get(f, {}).get("aberta")]
    final = "erro" if abertas and erros == len(abertas) else "concluido"
    c = await db.um(
        """update garimpos set status = %s, fim_em = now(), agora = null where id = %s and status = 'garimpando'
           returning status, vistos, transcritos, com_saas, ideias_novas""",
        (final, gid),
    )
    if c:
        await publicar(gid, "fim", c)


async def parar(garimpo_id: str) -> dict | None:
    """Marca parado e as fontes sem fim como paradas. O que já chegou fica."""
    g = await db.um(
        """update garimpos set status = 'parado', fim_em = now(), agora = null
           where id = %s and status in ('aguardando', 'garimpando')
           returning id, por_fonte, vistos, transcritos, com_saas, ideias_novas""",
        (garimpo_id,),
    )
    if not g:
        return None
    for fonte, estado in (g["por_fonte"] or {}).items():
        if estado.get("status") not in FINAIS:
            await _fonte(str(garimpo_id), fonte, status="parado")
    fim = {"status": "parado", **{k: g[k] for k in ("vistos", "transcritos", "com_saas", "ideias_novas")}}
    await publicar(str(garimpo_id), "fim", fim)
    return fim
