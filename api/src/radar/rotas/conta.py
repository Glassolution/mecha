"""Conta, espaço e entrada."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from radar import db, sessao
from radar.config import config
from radar.nichos import NICHOS
from radar.planos import PLANOS, uso

r = APIRouter(prefix="/api")


def _publico(e: dict, u: dict) -> dict:
    plano = PLANOS[e["plano"]]
    return {
        "conta": {"email": e["email"], "nome": e["conta_nome"]},
        "espaco": {
            "id": e["id"], "nome": e["nome"], "interesse": e["interesse"], "nichos": e["nichos"],
            "pais": e["pais"], "idioma": e["idioma"], "ver_ingles": e["ver_ingles"],
            "boas_vindas_ok": e["boas_vindas_ok"],
        },
        "plano": {"id": e["plano"], "nome": plano["nome"], "garimpos": plano["garimpos"]},
        "uso": {"garimpos": u["garimpos"], "planos_ideia": u["planos_ideia"]},
    }


@r.get("/eu")
async def eu(e=Depends(sessao.atual)):
    return _publico(e, await uso(e["id"]))


class Perfil(BaseModel):
    nome: str | None = Field(None, max_length=60)
    interesse: Literal["achar_ideia", "achar_criativo"] | None = None
    nichos: list[str] | None = None
    idioma: Literal["pt", "en", "es"] | None = None
    ver_ingles: bool | None = None
    boas_vindas_ok: bool | None = None


@r.patch("/espaco")
async def mudar_espaco(p: Perfil, e=Depends(sessao.atual)):
    campos = p.model_dump(exclude_none=True)
    if "nichos" in campos:
        campos["nichos"] = [n for n in campos["nichos"] if n in NICHOS]
    if campos:
        sets = ", ".join(f"{k} = %s" for k in campos)
        await db.executar(f"update espacos set {sets} where id = %s", (*campos.values(), e["id"]))
    return {"ok": True}


@r.post("/sair")
async def sair(request: Request, response: Response):
    await sessao.encerrar(request, response)
    return {"ok": True}


class EntradaDev(BaseModel):
    nome: str = Field("Meu espaço", max_length=60)


@r.post("/dev/entrar")
async def entrar_dev(dados: EntradaDev, response: Response):
    """Entrada só para desenvolvimento, no próprio Mac. Antes de publicar, vira Google e link mágico."""
    if config().ambiente != "dev":
        raise HTTPException(404)
    email = "voce@radar.local"
    conta = await db.um("select id from contas where email = %s", (email,))
    if not conta:
        async with db.conexao() as con:
            cur = await con.execute("insert into contas (email, nome) values (%s, %s) returning id", (email, "Você"))
            conta = await cur.fetchone()
            cur = await con.execute(
                "insert into espacos (dono_id, nome, plano) values (%s, %s, 'pro') returning id",
                (conta["id"], dados.nome),
            )
            espaco = await cur.fetchone()
            await con.execute("insert into membros (espaco_id, conta_id, papel) values (%s, %s, 'dono')",
                              (espaco["id"], conta["id"]))
    await sessao.criar(response, conta["id"])
    return {"ok": True}
