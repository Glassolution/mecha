"""Biblioteca: vídeos (modo Achar criativo), ideias, ficha, busca e capas."""

import asyncio
import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator

from radar import analise, db, sessao
from radar.armazenamento import caminho_capa
from radar.biblioteca import SELECT_VIDEO, cartao, ficha
from radar.coleta import comentarios
from radar.exemplos import ideias_exemplo
from radar.nichos import GRUPOS, NICHOS
from radar.notas import ATENCAO_VIEWS, PROVA_VIEWS, avalia_ideia
from radar.config import config
from radar.planos import itens_completos

log = logging.getLogger(__name__)
r = APIRouter(prefix="/api")

_ORDEM = {
    # em alta: views por dia desde a postagem (até termos 7 dias de histórico por vídeo)
    "em_alta": "v.views::float / greatest(extract(epoch from now() - v.publicado) / 86400, 1) desc nulls last",
    "views": "v.views desc nulls last",
    "recentes": "v.publicado desc nulls last",
    "salvamentos": "(coalesce(v.salvamentos,0) + coalesce(v.compartilhamentos,0))::float / greatest(v.views,1) desc",
}


@r.get("/nichos")
async def nichos():
    return [{"id": k, "rotulo": v[0]} for k, v in NICHOS.items()]


@r.get("/catalogo")
async def catalogo(e=Depends(sessao.atual)):
    """Colunas do Explorar com quantos vídeos reais há em cada nicho e idioma."""
    por_nicho = {r["n"]: r["c"] for r in await db.todos(
        "select n, count(*) as c from videos, unnest(nichos) n where sinal_software is not false group by n")}
    por_idioma = {r["idioma"]: r["c"] for r in await db.todos(
        "select idioma, count(*) as c from videos where sinal_software is not false group by idioma")}
    colunas = [
        {"titulo": titulo, "itens": [{"id": n, "rotulo": NICHOS[n][0], "total": por_nicho.get(n, 0)} for n in ids]}
        for titulo, ids in GRUPOS
    ]
    return {
        "colunas": colunas,
        "idiomas": [{"id": "pt", "rotulo": "Português", "total": por_idioma.get("pt", 0)},
                    {"id": "en", "rotulo": "Inglês", "total": por_idioma.get("en", 0)}],
    }


@r.get("/resumo")
async def resumo(e=Depends(sessao.atual)):
    """Números reais da biblioteca para o Início."""
    n = await db.um(
        """select count(*) as total,
                  count(*) filter (where visto_primeiro > now() - interval '7 days') as semana,
                  count(*) filter (where transcricao is not null) as transcritos
           from videos"""
    )
    capas = await db.todos(
        "select capa_path from videos where capa_path is not null and sinal_software is not false order by views desc nulls last limit 3"
    )
    ultimo = await db.um(
        "select id, termos, status, vistos from garimpos where espaco_id = %s order by criado_em desc limit 1", (e["id"],)
    )
    return {"videos_total": n["total"], "videos_semana": n["semana"], "transcritos": n["transcritos"],
            "capas": [c["capa_path"] for c in capas], "ultimo_garimpo": ultimo}


@r.get("/videos")
async def videos(
    e=Depends(sessao.atual),
    idioma: str | None = None,
    prova: Literal["qualquer", "leve", "media", "forte"] = "qualquer",
    ordem: Literal["em_alta", "views", "recentes", "salvamentos"] = "views",
    termo: str | None = None,
    nichos: str | None = None,
    so_software: bool = True,
    so_potencial: bool = False,
    limite: int = 60,
    pagina: int = 0,
):
    onde, params = ["true"], []
    if idioma is None and config().so_portugues:  # sem escolha na tela, só português
        idioma = "pt"
    if idioma and idioma != "todos":
        onde.append("v.idioma = any(%s)")
        params.append(idioma.split(","))
    if prova != "qualquer":
        onde.append("v.views >= %s")
        params.append(PROVA_VIEWS[prova])
    if termo:
        onde.append("%s = any(v.termos)")
        params.append(termo)
    if nichos:
        onde.append("v.nichos && %s")
        params.append([n for n in nichos.split(",") if n in NICHOS])
    if so_software:
        onde.append("v.sinal_software is not false")
    if so_potencial:  # só o que passou na triagem de SaaS (página Ideias)
        onde.append("v.potencial_saas >= %s")
        params.append(config().nota_minima_saas)
    limite = min(limite, 120)
    linhas = await db.todos(
        SELECT_VIDEO + f" where {' and '.join(onde)} order by {_ORDEM[ordem]} limit %s offset %s",
        (*params, limite, pagina * limite),
    )
    total = (await db.um(f"select count(*) as n from videos v where {' and '.join(onde)}", params))["n"]
    completos = itens_completos(e)
    itens = [cartao(v, bloqueado=completos is not None and pagina * limite + i >= completos)
             for i, v in enumerate(linhas)]
    return {"total": total, "itens": itens}


@r.get("/videos/{video_id}")
async def ver_video(video_id: str, e=Depends(sessao.atual)):
    v = await db.um(SELECT_VIDEO + " where v.id = %s", (video_id,))
    if not v:
        raise HTTPException(404, "Vídeo não encontrado.")
    v["saas"] = await db.todos(
        """select s.id, s.nome, s.dominio, vs.papel, vs.trecho, vs.inicio_s
           from video_saas vs join saas s on s.id = vs.saas_id where vs.video_id = %s""",
        (video_id,),
    )
    origem = await db.um(
        """select g.id, g.modo from garimpos g join garimpo_videos gv on gv.garimpo_id = g.id
           where g.espaco_id = %s and gv.video_id = %s order by g.criado_em desc, g.id desc limit 1""",
        (e["id"], video_id),
    )
    return {**ficha(v), "garimpo_id": origem["id"] if origem else None, "garimpo_modo": origem["modo"] if origem else None}


async def _analise_salva(espaco_id, video_id: str) -> dict | None:
    linha = await db.um(
        "select resultado, criado_em from analises_video where espaco_id = %s and video_id = %s", (espaco_id, video_id)
    )
    return {**linha["resultado"], "criado_em": linha["criado_em"]} if linha else None


@r.get("/videos/{video_id}/analise")
async def ver_analise(video_id: str, e=Depends(sessao.atual)):
    """A análise já feita para este espaço, ou null (a tela oferece o botão Analisar)."""
    return await _analise_salva(e["id"], video_id)


@r.post("/videos/{video_id}/analise")
async def fazer_analise(video_id: str, e=Depends(sessao.atual)):
    """Analisa o vídeo uma vez por espaço; pedir de novo devolve a mesma análise, sem custo."""
    pronta = await _analise_salva(e["id"], video_id)
    if pronta:
        return pronta
    v = await db.um("select * from videos where id = %s", (video_id,))
    if not v:
        raise HTTPException(404, "Vídeo não encontrado.")
    hoje = await db.um(
        "select count(*) as n from analises_video where espaco_id = %s and criado_em > now() - interval '1 day'", (e["id"],)
    )
    if hoje["n"] >= config().analises_por_dia:
        raise HTTPException(429, "Você chegou ao limite de análises de hoje. Volte amanhã.")
    meu = await db.um("select nome, tipo, o_que_faz from meus_saas where espaco_id = %s order by nome limit 1", (e["id"],))
    try:
        resultado, gasto = await analise.analisar(v, e, meu)
    except analise.SemChave:
        raise HTTPException(409, "A análise ainda não está ligada neste servidor.")
    except Exception:
        log.exception("análise do vídeo %s falhou", video_id)
        raise HTTPException(409, "Não deu para analisar agora. Tente de novo em 1 minuto.")
    await db.executar(
        """insert into analises_video (espaco_id, video_id, resultado, modelo, custo_tokens) values (%s, %s, %s, %s, %s)
           on conflict (espaco_id, video_id) do nothing""",
        (e["id"], video_id, Jsonb(resultado), config().modelo_analise, gasto),
    )
    return await _analise_salva(e["id"], video_id)


class PerguntaVideo(BaseModel):
    pedido_id: UUID
    texto: str = Field(min_length=1, max_length=4000)

    @field_validator("texto")
    @classmethod
    def sem_vazio(cls, texto: str) -> str:
        if not texto.strip():
            raise ValueError("Escreva uma pergunta.")
        return texto.strip()


def _mensagens(turnos: list[dict]) -> list[dict]:
    return [mensagem for turno in turnos for mensagem in (
        {"id": f"{turno['pedido_id']}:user", "papel": "user", "texto": turno["pergunta"], "criado_em": turno["criado_em"]},
        {"id": f"{turno['pedido_id']}:assistant", "papel": "assistant", "texto": turno["resposta"], "criado_em": turno["criado_em"]},
    )]


@r.get("/videos/{video_id}/conversa")
async def ver_conversa(video_id: str, e=Depends(sessao.atual)):
    turnos = await db.todos(
        """select pedido_id, pergunta, resposta, criado_em from conversas_video
           where espaco_id = %s and video_id = %s order by criado_em desc, pedido_id desc limit 100""",
        (e["id"], video_id),
    )
    return _mensagens(list(reversed(turnos)))


async def _comentarios(v: dict, buscar: bool) -> list[dict]:
    """Comentários do vídeo para a conversa. Na primeira análise, busca na Apify os que faltam
    (reaproveitados por 7 dias); se a busca falhar ou demorar, a análise segue sem eles."""
    if buscar:
        try:
            await asyncio.wait_for(comentarios.garantir([v], config().comentarios_por_video, comentarios.coletores()), 75)
        except Exception:
            log.warning("comentários do vídeo %s não vieram; a análise segue sem eles", v["id"], exc_info=True)
    return await db.todos("select texto, curtidas from comentarios_video where video_id = %s order by curtidas desc nulls last, posicao",
                          (v["id"],))


@r.post("/videos/{video_id}/conversa")
async def conversar_video(video_id: str, pergunta: PerguntaVideo, e=Depends(sessao.atual)):
    # Uma resposta por espaço por vez. O lock e o limite diário também valem entre abas/processos.
    async with db.conexao() as con:
        async with con.transaction():
            cur = await con.execute("select pg_try_advisory_xact_lock(hashtextextended(%s, 0)) as ok", (f"chat:{e['id']}",))
            if not (await cur.fetchone())["ok"]:
                raise HTTPException(409, "A Wae já está respondendo neste espaço. Aguarde e tente novamente.")
            cur = await con.execute(
                "select * from conversas_video where espaco_id = %s and video_id = %s and pedido_id = %s",
                (e["id"], video_id, pergunta.pedido_id),
            )
            salva = await cur.fetchone()
            if salva:
                if salva["pergunta"] != pergunta.texto:
                    raise HTTPException(409, "Este envio já foi usado para outra pergunta. Envie novamente.")
                return _mensagens([salva])
            cur = await con.execute("select * from videos where id = %s", (video_id,))
            v = await cur.fetchone()
            if not v:
                raise HTTPException(404, "Vídeo não encontrado.")
            cur = await con.execute("select count(*) as n from conversas_video where espaco_id = %s and criado_em > now() - interval '1 day'", (e["id"],))
            if (await cur.fetchone())["n"] >= config().mensagens_chat_por_dia:
                raise HTTPException(429, "Você chegou ao limite de mensagens de hoje. Volte amanhã.")
            cur = await con.execute("select nome, tipo, o_que_faz from meus_saas where espaco_id = %s order by nome limit 1", (e["id"],))
            meu = await cur.fetchone()
            cur = await con.execute("select pergunta, resposta from conversas_video where espaco_id = %s and video_id = %s order by criado_em desc, pedido_id desc limit 8", (e["id"], video_id))
            historico = list(reversed(await cur.fetchall()))
            cur = await con.execute("select resultado from analises_video where espaco_id = %s and video_id = %s", (e["id"], video_id))
            anterior = await cur.fetchone()
            v["lista_comentarios"] = await _comentarios(v, buscar=not historico)
            try:
                resposta, gasto = await analise.conversar(v, e, meu, historico, pergunta.texto, anterior["resultado"] if anterior else None)
            except analise.SemChave:
                raise HTTPException(409, "A IA ainda não está conectada neste servidor.")
            except Exception:
                log.exception("conversa do vídeo %s falhou", video_id)
                raise HTTPException(409, "Não foi possível responder agora. Sua pergunta pode ser enviada novamente.")
            cur = await con.execute(
                """insert into conversas_video (espaco_id, video_id, pedido_id, pergunta, resposta, modelo, custo_tokens)
                   values (%s, %s, %s, %s, %s, %s, %s) returning *""",
                (e["id"], video_id, pergunta.pedido_id, pergunta.texto, resposta, config().modelo_analise, gasto),
            )
            return _mensagens([await cur.fetchone()])


@r.get("/ideias")
async def ideias(
    e=Depends(sessao.atual),
    nicho: str | None = None,
    atencao: Literal["leve", "media", "forte"] = "leve",
    tendencia: Literal["subindo", "media", "explodindo"] = "subindo",
    sem_br: bool = False,
    prateleira: Literal["todas", "explodindo", "fora", "criadores", "vistas"] = "todas",
):
    criterios = {"atencao": atencao, "tendencia": tendencia, "sem_br": sem_br,
                 "nichos": [nicho] if nicho else []}
    lista = ideias_exemplo()
    if nicho:
        lista = [i for i in lista if i["nicho"] == nicho]
    if prateleira == "explodindo":
        lista = [i for i in lista if (i["crescimento"] or 0) >= 0.5 and i["videos"] >= 3]
        lista.sort(key=lambda i: i["crescimento"] or 0, reverse=True)
    elif prateleira == "fora":
        lista = [i for i in lista if i["tem_versao_br"] is False]
    elif prateleira == "criadores":
        lista.sort(key=lambda i: i["autores"], reverse=True)
    elif prateleira == "vistas":
        lista.sort(key=lambda i: i["views_total"], reverse=True)
    else:
        lista.sort(key=lambda i: i["nota"], reverse=True)
    completos = itens_completos(e)
    saida = []
    for n, i in enumerate(lista):
        if completos is not None and n >= completos:
            saida.append({"id": i["id"], "bloqueado": True, "exemplo": True})
            continue
        saida.append({**{k: v for k, v in i.items() if k != "serie_30d"}, "veredito": avalia_ideia(i, criterios)})
    return {"exemplo": True, "limites": {"atencao": ATENCAO_VIEWS}, "itens": saida}


@r.get("/ideias/{ideia_id}")
async def ver_ideia(ideia_id: str, e=Depends(sessao.atual)):
    for i in ideias_exemplo():
        if i["id"] == ideia_id:
            return {**i, "veredito": avalia_ideia(i), "videos_lista": []}
    raise HTTPException(404, "Ideia não encontrada.")


@r.get("/busca")
async def busca(q: str, e=Depends(sessao.atual)):
    q = q.strip()
    if len(q) < 2:
        return {"videos": [], "ideias": [], "colecoes": []}
    padrao = f"%{q}%"
    vids = await db.todos(
        SELECT_VIDEO + " where v.texto ilike %s or v.autor ilike %s or %s = any(v.termos) order by v.views desc nulls last limit 8",
        (padrao, padrao, q.lower()),
    )
    cols = await db.todos("select id, nome from colecoes where espaco_id = %s and nome ilike %s limit 5", (e["id"], padrao))
    ql = q.lower()
    ids = [{"id": i["id"], "titulo_pt": i["titulo_pt"], "nicho_rotulo": i["nicho_rotulo"], "exemplo": True}
           for i in ideias_exemplo() if ql in i["titulo_pt"].lower() or ql in i["nicho_rotulo"].lower()][:5]
    return {"videos": [cartao(v) for v in vids], "ideias": ids, "colecoes": cols}


@r.get("/capas/{nome}")
async def capa(nome: str, e=Depends(sessao.atual)):
    caminho = caminho_capa(nome)
    if not caminho:
        raise HTTPException(404)
    return FileResponse(caminho, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})
