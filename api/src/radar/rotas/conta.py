"""Conta, espaço e entrada."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from radar import db, sessao
from radar.armazenamento import dominio_do_site, logo_do_site
from radar.config import config
from radar.nichos import NICHOS
from radar.planos import PLANOS, uso

r = APIRouter(prefix="/api")


def _publico(e: dict, u: dict, meu_saas: dict | None) -> dict:
    plano = PLANOS[e["plano"]]
    return {
        "conta": {"email": e["email"], "nome": e["conta_nome"]},
        "espaco": {
            "id": e["id"], "nome": e["nome"], "interesse": e["interesse"], "nichos": e["nichos"],
            "pais": e["pais"], "idioma": e["idioma"], "ver_ingles": e["ver_ingles"],
            "boas_vindas_ok": e["boas_vindas_ok"], "perfil": e.get("perfil"), "objetivo": e.get("objetivo"),
        },
        "meu_saas": meu_saas,
        "plano": {"id": e["plano"], "nome": plano["nome"], "garimpos": plano["garimpos"]},
        "uso": {"garimpos": u["garimpos"], "planos_ideia": u["planos_ideia"]},
    }


@r.get("/eu")
async def eu(e=Depends(sessao.atual)):
    meu = await db.um("select nome, tipo, link, o_que_faz from meus_saas where espaco_id = %s order by nome limit 1", (e["id"],))
    return _publico(e, await uso(e["id"]), meu)


class Perfil(BaseModel):
    nome: str | None = Field(None, max_length=60)
    interesse: Literal["achar_ideia", "achar_criativo"] | None = None
    nichos: list[str] | None = None
    idioma: Literal["pt", "en", "es"] | None = None
    ver_ingles: bool | None = None
    boas_vindas_ok: bool | None = None
    perfil: Literal["founder", "empresario", "investidor", "passeando"] | None = None
    objetivo: Literal["ideias", "criativos", "os_dois"] | None = None
    meu_nome: str | None = Field(None, max_length=60)


@r.patch("/espaco")
async def mudar_espaco(p: Perfil, e=Depends(sessao.atual)):
    campos = p.model_dump(exclude_none=True)
    meu_nome = campos.pop("meu_nome", None)
    if meu_nome is not None and meu_nome.strip():
        await db.executar("update contas set nome = %s where id = %s", (meu_nome.strip(), e["conta_id"]))
    if "objetivo" in campos and "interesse" not in campos:
        campos["interesse"] = "achar_criativo" if campos["objetivo"] == "criativos" else "achar_ideia"
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
    """Entrada só para os testes automáticos. Gente de verdade entra pelo Supabase."""
    if config().ambiente != "teste":
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


class MeuSaas(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    tipo: Literal["saas", "app", "ecommerce", "infoproduto", "servico", "marketplace", "conteudo", "outro"] | None = None
    link: str | None = Field(None, max_length=300)
    o_que_faz: str | None = Field(None, max_length=300)


@r.put("/meu-saas")
async def salvar_meu_saas(dados: MeuSaas, e=Depends(sessao.atual)):
    """O negócio online da pessoa (SaaS, app, loja…), do quiz ou das configurações. Um por espaço por enquanto."""
    link = (dados.link or "").strip() or None
    if link and not link.startswith(("http://", "https://")):
        link = f"https://{link}"
    async with db.conexao() as con:
        await con.execute("delete from meus_saas where espaco_id = %s", (e["id"],))
        await con.execute(
            "insert into meus_saas (espaco_id, nome, tipo, link, o_que_faz) values (%s, %s, %s, %s, %s)",
            (e["id"], dados.nome.strip(), dados.tipo, link, (dados.o_que_faz or "").strip() or None),
        )
    return {"ok": True}


@r.get("/logo")
async def logo(site: str, e=Depends(sessao.atual)):
    """Logo do site do SaaS da pessoa, buscada pela API (o navegador nunca fala com o serviço de ícones)."""
    dominio = dominio_do_site(site)
    achada = await logo_do_site(dominio) if dominio else None
    if not achada:
        raise HTTPException(404, "Esse site não tem logo.")
    conteudo, tipo = achada
    return Response(conteudo, media_type=tipo, headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})
