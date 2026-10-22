"""Salvos: coleções, salvar e tirar, planilha para o Excel."""

import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from radar import db, sessao
from radar.armazenamento import url_capa
from radar.biblioteca import SELECT_VIDEO, cartao
from radar.exemplos import ideias_exemplo
from radar.notas import fmt_num, prova_organico

r = APIRouter(prefix="/api")


class NovaColecao(BaseModel):
    nome: str = Field(min_length=1, max_length=60)


async def _colecao(colecao_id: str, e: dict) -> dict:
    try:
        c = await db.um("select * from colecoes where id = %s::uuid and espaco_id = %s", (colecao_id, e["id"]))
    except Exception:
        c = None
    if not c:
        raise HTTPException(404, "Coleção não encontrada.")
    return c


@r.get("/colecoes")
async def colecoes(e=Depends(sessao.atual)):
    cs = await db.todos(
        """select c.id, c.nome, c.criado_em, count(s.item_id) as itens,
                  (array_agg(v.capa_path order by s.salvo_em desc) filter (where v.capa_path is not null))[1:3] as capas
           from colecoes c
           left join salvos s on s.colecao_id = c.id
           left join videos v on s.item_tipo = 'video' and v.id = s.item_id
           where c.espaco_id = %s group by c.id order by c.criado_em""",
        (e["id"],),
    )
    return [{**c, "capas": [url_capa(n) for n in c["capas"] or []]} for c in cs]


@r.post("/colecoes")
async def criar_colecao(dados: NovaColecao, e=Depends(sessao.atual)):
    return await db.um("insert into colecoes (espaco_id, nome) values (%s, %s) returning id, nome",
                       (e["id"], dados.nome.strip()))


@r.patch("/colecoes/{colecao_id}")
async def renomear(colecao_id: str, dados: NovaColecao, e=Depends(sessao.atual)):
    c = await _colecao(colecao_id, e)
    await db.executar("update colecoes set nome = %s where id = %s", (dados.nome.strip(), c["id"]))
    return {"ok": True}


@r.delete("/colecoes/{colecao_id}")
async def apagar_colecao(colecao_id: str, e=Depends(sessao.atual)):
    c = await _colecao(colecao_id, e)
    await db.executar("delete from colecoes where id = %s", (c["id"],))
    return {"ok": True}


async def _itens(c: dict) -> list[dict]:
    salvos = await db.todos("select item_tipo, item_id, salvo_em from salvos where colecao_id = %s order by salvo_em desc",
                            (c["id"],))
    ids_video = [s["item_id"] for s in salvos if s["item_tipo"] == "video"]
    vids = {v["id"]: v for v in await db.todos(SELECT_VIDEO + " where v.id = any(%s)", (ids_video,))} if ids_video else {}
    ideias = {i["id"]: i for i in ideias_exemplo()}
    itens = []
    for s in salvos:
        if s["item_tipo"] == "video" and s["item_id"] in vids:
            itens.append({"tipo": "video", "salvo_em": s["salvo_em"], "video": vids[s["item_id"]]})
        elif s["item_tipo"] == "ideia" and s["item_id"] in ideias:
            itens.append({"tipo": "ideia", "salvo_em": s["salvo_em"], "ideia": ideias[s["item_id"]]})
    return itens


@r.get("/colecoes/{colecao_id}")
async def ver_colecao(colecao_id: str, e=Depends(sessao.atual)):
    c = await _colecao(colecao_id, e)
    itens = await _itens(c)
    return {
        "id": c["id"], "nome": c["nome"],
        "itens": [
            {"tipo": "video", "salvo_em": i["salvo_em"], "video": cartao(i["video"])} if i["tipo"] == "video"
            else {"tipo": "ideia", "salvo_em": i["salvo_em"],
                  "ideia": {k: v for k, v in i["ideia"].items() if k != "serie_30d"}}
            for i in itens
        ],
    }


class Salvar(BaseModel):
    colecao_id: str
    item_tipo: Literal["video", "ideia"]
    item_id: str = Field(max_length=200)


@r.post("/salvos")
async def salvar(dados: Salvar, e=Depends(sessao.atual)):
    c = await _colecao(dados.colecao_id, e)
    if dados.item_tipo == "video" and not await db.um("select 1 from videos where id = %s", (dados.item_id,)):
        raise HTTPException(404, "Vídeo não encontrado.")
    await db.executar(
        "insert into salvos (colecao_id, item_tipo, item_id) values (%s, %s, %s) on conflict do nothing",
        (c["id"], dados.item_tipo, dados.item_id),
    )
    return {"ok": True}


@r.delete("/salvos/{colecao_id}/{item_tipo}/{item_id:path}")
async def tirar(colecao_id: str, item_tipo: str, item_id: str, e=Depends(sessao.atual)):
    c = await _colecao(colecao_id, e)
    await db.executar("delete from salvos where colecao_id = %s and item_tipo = %s and item_id = %s",
                      (c["id"], item_tipo, item_id))
    return {"ok": True}


@r.get("/salvos/onde")
async def onde_esta(item_tipo: str, item_id: str, e=Depends(sessao.atual)):
    """Em quais coleções este item já está (para o menu Salvar em…)."""
    linhas = await db.todos(
        """select s.colecao_id from salvos s join colecoes c on c.id = s.colecao_id
           where c.espaco_id = %s and s.item_tipo = %s and s.item_id = %s""",
        (e["id"], item_tipo, item_id),
    )
    return [str(l["colecao_id"]) for l in linhas]


COLUNAS = ["Gancho", "Tradução", "Formato", "Plataforma", "Idioma", "Prova", "Duração", "Tela", "Dá para trocar",
           "Nota", "Autor", "Link", "SaaS", "Domínio", "Nicho", "Ideia", "Tendência"]


@r.get("/colecoes/{colecao_id}/planilha.csv")
async def planilha(colecao_id: str, e=Depends(sessao.atual)):
    """CSV com ';' e BOM UTF-8, para abrir no Excel com acentos."""
    c = await _colecao(colecao_id, e)
    saida = io.StringIO()
    w = csv.writer(saida, delimiter=";", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
    w.writerow(COLUNAS)
    for i in await _itens(c):
        if i["tipo"] == "video":
            v = i["video"]
            av = v.get("avaliacao") or {}
            plataforma = {"tiktok": "TikTok", "youtube": "YouTube", "tiktok_ads": "TikTok Ads",
                          "meta_ads": "Facebook", "instagram": "Instagram"}.get(v["fonte"], v["fonte"])
            tela = "vertical" if v.get("vertical") else ("deitada" if v.get("vertical") is False else "")
            w.writerow([
                av.get("gancho") or (v.get("texto") or "").split("\n")[0][:160], av.get("gancho_pt") or "",
                av.get("formato") or "", plataforma, v.get("idioma") or "",
                f"{fmt_num(v.get('views'))} views (prova {prova_organico(v.get('views'), v.get('compartilhamentos'), v.get('salvamentos')) or 0})",
                f"{v['duracao_s']} s" if v.get("duracao_s") else "", tela, "", av.get("nota") or "",
                v.get("autor") or "", v["url_original"], "", "", "", "", "",
            ])
        else:
            ideia = i["ideia"]
            cres = ideia.get("crescimento")
            w.writerow([
                "", "", "", "", "", f"{fmt_num(ideia['views_total'])} views (EXEMPLO)", "", "", "", ideia["nota"], "",
                "", "", "", ideia["nicho_rotulo"], f"{ideia['titulo_pt']} (EXEMPLO)",
                "medindo" if cres is None else f"{'+' if cres >= 0 else ''}{round(cres * 100)}% em 7 dias",
            ])
    nome = "".join(ch for ch in c["nome"] if ch.isalnum() or ch in " -_").strip() or "colecao"
    return Response(
        "﻿" + saida.getvalue(), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nome}.csv"'},
    )
