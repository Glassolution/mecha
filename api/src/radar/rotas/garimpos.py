"""Garimpo: criar, acompanhar ao vivo (SSE), parar e ver a grade."""

import asyncio
import json
from typing import Literal

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from radar import db, fluxo, garimpo, sessao
from radar.biblioteca import SELECT_VIDEO, cartao
from radar.coleta.regras import normalizar_termo
from radar.config import config
from radar.nichos import palavras as sugerir_palavras
from radar.planos import gastar_garimpo

r = APIRouter(prefix="/api")
_fila = None


async def fila():
    global _fila
    if _fila is None:
        _fila = await create_pool(RedisSettings.from_dsn(config().redis_url))
    return _fila


@r.get("/fontes")
async def fontes():
    return [{"id": k, **v} for k, v in garimpo.FONTES.items()]


@r.get("/palavras")
async def palavras(nicho: str | None = None, pagina: int = 0):
    return sugerir_palavras(nicho, pagina)


class NovoGarimpo(BaseModel):
    termos: list[str] = Field(min_length=1, max_length=20)
    termos_idioma: dict[str, Literal["pt", "en", "es"]] = {}
    fontes: list[str] = ["tiktok"]
    idiomas: list[Literal["pt", "en", "es"]] = ["pt", "en"]
    modo: Literal["ideia", "criativo"] = "ideia"
    criterios: dict = {}

    @field_validator("termos")
    @classmethod
    def limpar(cls, v: list[str]) -> list[str]:
        vistos, saida = set(), []
        for t in v:
            t = normalizar_termo(t)[:80]
            if t and t not in vistos:
                vistos.add(t)
                saida.append(t)
        if not saida:
            raise ValueError("Escreva pelo menos uma palavra.")
        return saida


async def _do_espaco(garimpo_id: str, e: dict) -> dict:
    try:
        g = await db.um("select * from garimpos where id = %s::uuid and espaco_id = %s", (garimpo_id, e["id"]))
    except Exception:
        g = None
    if not g:
        raise HTTPException(404, "Garimpo não encontrado.")
    return g


def _resumo(g: dict) -> dict:
    return {k: g[k] for k in ("id", "modo", "termos", "fontes", "idiomas", "criterios", "status", "agora", "por_fonte",
                              "vistos", "transcritos", "com_saas", "ideias_novas", "fracos", "criado_em", "fim_em")}


@r.post("/garimpos")
async def criar(dados: NovoGarimpo, e=Depends(sessao.atual)):
    fontes = [f for f in dados.fontes if f in garimpo.FONTES] or ["tiktok"]
    termos_idioma = {normalizar_termo(k): v for k, v in dados.termos_idioma.items()}
    idiomas = dados.idiomas
    if config().so_portugues:  # toda palavra é buscada no Brasil, em português
        idiomas, termos_idioma = ["pt"], {t: "pt" for t in dados.termos}
    await gastar_garimpo(e)
    g = await db.um(
        """insert into garimpos (espaco_id, modo, termos, termos_idioma, fontes, idiomas, criterios, por_fonte)
           values (%s, %s, %s, %s, %s, %s, %s, %s) returning id""",
        (e["id"], dados.modo, dados.termos, json.dumps(termos_idioma), fontes, idiomas,
         json.dumps(dados.criterios), json.dumps({f: {"status": "na_fila"} for f in fontes})),
    )
    await (await fila()).enqueue_job("rodar_garimpo", str(g["id"]), _job_id=f"garimpo:{g['id']}")
    return {"id": g["id"]}


@r.get("/garimpos")
async def recentes(e=Depends(sessao.atual), limite: int = 3):
    linhas = await db.todos(
        "select * from garimpos where espaco_id = %s order by criado_em desc limit %s", (e["id"], min(limite, 50))
    )
    return [_resumo(g) for g in linhas]


@r.get("/garimpos/{garimpo_id}")
async def ver(garimpo_id: str, e=Depends(sessao.atual)):
    return _resumo(await _do_espaco(garimpo_id, e))


@r.post("/garimpos/{garimpo_id}/parar")
async def parar(garimpo_id: str, e=Depends(sessao.atual)):
    g = await _do_espaco(garimpo_id, e)
    fim = await garimpo.parar(str(g["id"]))
    return fim or {"status": g["status"]}


async def _mais_novos(garimpo_id, limite=48) -> list[dict]:
    linhas = await db.todos(
        SELECT_VIDEO + """ join garimpo_videos gv on gv.video_id = v.id
           where gv.garimpo_id = %s order by gv.chegou_em desc limit %s""",
        (garimpo_id, limite),
    )
    return [cartao(v) for v in linhas]


@r.get("/garimpos/{garimpo_id}/videos")
async def videos(garimpo_id: str, e=Depends(sessao.atual), limite: int = 200):
    g = await _do_espaco(garimpo_id, e)
    linhas = await db.todos(
        SELECT_VIDEO + """ join garimpo_videos gv on gv.video_id = v.id
           where gv.garimpo_id = %s order by v.views desc nulls last limit %s""",
        (g["id"], min(limite, 500)),
    )
    return [cartao(v) for v in linhas]


@r.get("/garimpos/{garimpo_id}/fluxo")
async def fluxo_ao_vivo(garimpo_id: str, request: Request, e=Depends(sessao.atual)):
    g = await _do_espaco(garimpo_id, e)
    gid = str(g["id"])
    ultimo = request.headers.get("last-event-id")

    async def eventos():
        nonlocal ultimo
        atual = await db.um("select * from garimpos where id = %s", (gid,))
        terminou = atual["status"] in ("concluido", "erro", "parado")
        if not ultimo or terminou:
            # retrato: o estado inteiro ao conectar
            ultimo = await fluxo.ultimo_id(gid)
            retrato = {"garimpo": _resumo(atual), "videos": await _mais_novos(gid)}
            yield _sse("retrato", retrato, ultimo)
            if terminou:
                yield _sse("fim", {k: atual[k] for k in ("status", "vistos", "transcritos", "com_saas", "ideias_novas", "fracos")}, ultimo)
                return
        while True:
            if await request.is_disconnected():
                return
            lote = await fluxo.ler(gid, ultimo, bloquear_ms=15000)
            if not lote:
                yield ": batimento\n\n"
                continue
            for id_, tipo, dados in lote:
                ultimo = id_
                yield _sse(tipo, dados, id_)
                if tipo == "fim":
                    return

    return StreamingResponse(
        eventos(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )


_SELECT_OPORTUNIDADES = """select status, etapa, resultado, erro, criado_em, atualizado_em from oportunidades_garimpo
                           where garimpo_id = %s"""


@r.get("/garimpos/{garimpo_id}/oportunidades")
async def ver_oportunidades(garimpo_id: str, e=Depends(sessao.atual)):
    """A análise de oportunidades deste garimpo, ou null (a tela oferece o botão)."""
    g = await _do_espaco(garimpo_id, e)
    return await db.um(_SELECT_OPORTUNIDADES, (g["id"],))


@r.post("/garimpos/{garimpo_id}/oportunidades")
async def pedir_oportunidades(garimpo_id: str, e=Depends(sessao.atual)):
    """Uma análise por garimpo: pedir de novo devolve a mesma; se deu erro (ou travou), refaz."""
    g = await _do_espaco(garimpo_id, e)
    if g["status"] != "concluido":
        raise HTTPException(409, "Espere a busca terminar para analisar as oportunidades.")
    if not await db.um("select 1 from garimpo_videos where garimpo_id = %s limit 1", (g["id"],)):
        raise HTTPException(409, "Esta busca não trouxe vídeos para analisar.")
    feita = await db.um(_SELECT_OPORTUNIDADES, (g["id"],))
    if feita:
        refazer = await db.um(
            """update oportunidades_garimpo set status = 'analisando', etapa = null, erro = null, atualizado_em = now()
               where garimpo_id = %s and (status = 'erro'
                     or (status = 'analisando' and atualizado_em < now() - interval '15 minutes'))
               returning garimpo_id""",
            (g["id"],),
        )
        if not refazer:
            return feita
    else:
        hoje = await db.um(
            "select count(*) as n from oportunidades_garimpo where espaco_id = %s and criado_em > now() - interval '1 day'",
            (e["id"],),
        )
        if hoje["n"] >= config().oportunidades_por_dia:
            raise HTTPException(429, "Você chegou ao limite de análises de oportunidades de hoje. Volte amanhã.")
        nova = await db.um(
            """insert into oportunidades_garimpo (garimpo_id, espaco_id) values (%s, %s)
               on conflict (garimpo_id) do nothing returning garimpo_id""",
            (g["id"], e["id"]),
        )
        if not nova:
            return await db.um(_SELECT_OPORTUNIDADES, (g["id"],))
    await (await fila()).enqueue_job("analisar_oportunidades", str(g["id"]))
    return await db.um(_SELECT_OPORTUNIDADES, (g["id"],))


def _sse(tipo: str, dados, id_: str) -> str:
    return f"id: {id_}\nevent: {tipo}\ndata: {json.dumps(dados, default=str)}\n\n"


async def fechar_fila():
    global _fila
    if _fila is not None:
        await _fila.aclose()
        _fila = None
    await asyncio.sleep(0)
