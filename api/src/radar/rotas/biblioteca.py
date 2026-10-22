"""Biblioteca: vídeos (modo Achar criativo), ideias, ficha, busca e capas."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse

from radar import db, sessao
from radar.armazenamento import caminho_capa, nome_valido, url_capa
from radar.biblioteca import SELECT_VIDEO, cartao, ficha
from radar.exemplos import ideias_exemplo
from radar.nichos import GRUPOS, NICHOS
from radar.notas import ATENCAO_VIEWS, PROVA_VIEWS, avalia_ideia
from radar.planos import itens_completos

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
            "capas": [url_capa(c["capa_path"]) for c in capas], "ultimo_garimpo": ultimo}


@r.get("/videos")
async def videos(
    e=Depends(sessao.atual),
    idioma: str | None = None,
    prova: Literal["qualquer", "leve", "media", "forte"] = "qualquer",
    ordem: Literal["em_alta", "views", "recentes", "salvamentos"] = "views",
    termo: str | None = None,
    nichos: str | None = None,
    so_software: bool = True,
    limite: int = 60,
    pagina: int = 0,
):
    onde, params = ["true"], []
    if idioma:
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
    return ficha(v)


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
async def capa(nome: str):
    # endereço antigo de uma capa que agora mora no Storage
    if nome_valido(nome) and (url := url_capa(nome)).startswith("https://"):
        return RedirectResponse(url, status_code=301)
    caminho = caminho_capa(nome)
    if not caminho:
        raise HTTPException(404)
    return FileResponse(caminho, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=604800"})
