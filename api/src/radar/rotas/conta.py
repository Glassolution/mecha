"""Conta, espaço e entrada."""

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, Field, field_validator

from radar import admin, db, sessao
from radar.armazenamento import dominio_do_site, logo_do_site
from radar.config import config
from radar.nichos import NICHOS
from radar.planos import PLANOS, uso

r = APIRouter(prefix="/api")


def _publico(e: dict, u: dict, meu_saas: dict | None) -> dict:
    plano = PLANOS[e["plano"]]
    return {
        "admin": admin.permitido(e.get("_email_autenticado")),
        "conta": {"email": e["email"], "nome": e["conta_nome"],
                  "identificador": e.get("conta_identificador"), "bio": e.get("conta_bio"),
                  "whatsapp": e.get("conta_whatsapp"), "avatar": e.get("conta_avatar", "acenando"),
                  "cor_perfil": e.get("conta_cor_perfil", "amarelo"),
                  "cor_personagem": e.get("conta_cor_personagem", "amarelo"), "criado_em": e.get("conta_criado_em")},
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


@r.get("/planos")
async def listar_planos(e=Depends(sessao.atual)):
    return {
        "moeda": "BRL", "periodicidade": "mensal", "contratacao_disponivel": False,
        "itens": [{"id": id, "nome": p["nome"], "garimpos": p["garimpos"],
                   "itens_completos": p["itens_completos"], "preco_mensal_centavos": p["preco_mensal_centavos"]}
                  for id, p in PLANOS.items()],
    }


class Identidade(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=60)
    identificador: str | None = Field(None, min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")
    bio: str | None = Field(None, max_length=80)
    whatsapp: str | None = Field(None, max_length=30)
    avatar: Literal["acenando", "pensando", "pesquisando", "bracos-abertos", "andando", "pulando", "sentado", "oi"] | None = None
    cor_perfil: Literal["amarelo", "coral", "salvia", "azul", "laranja", "lilas", "rosa"] | None = None
    cor_personagem: Literal["amarelo", "coral", "salvia", "azul", "laranja", "lilas", "rosa", "menta"] | None = None

    @field_validator("nome", "identificador", "bio", mode="before")
    @classmethod
    def limpar_texto(cls, valor):
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("identificador", mode="before")
    @classmethod
    def identificador_minusculo(cls, valor):
        return valor.strip().lower() if isinstance(valor, str) else valor

    @field_validator("whatsapp", mode="before")
    @classmethod
    def telefone(cls, valor):
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            return None
        if not isinstance(valor, str) or not re.fullmatch(r"\+?[\d\s().-]+", valor.strip()):
            raise ValueError("Confira o WhatsApp informado.")
        digitos = re.sub(r"\D", "", valor)
        if not 8 <= len(digitos) <= 15:
            raise ValueError("Informe o número com DDD e código do país.")
        return "+" + digitos


@r.get("/conta/identificador")
async def identificador_disponivel(valor: str = Query(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$"), e=Depends(sessao.atual)):
    existente = await db.um("select id from contas where lower(identificador) = %s and id <> %s", (valor, e["conta_id"]))
    return {"disponivel": existente is None}


@r.patch("/conta")
async def mudar_conta(p: Identidade, e=Depends(sessao.atual)):
    campos = p.model_dump(exclude_unset=True)
    for obrigatorio in ("nome", "avatar", "cor_perfil", "cor_personagem"):
        if obrigatorio in campos and campos[obrigatorio] is None:
            raise HTTPException(422, "Nome, avatar e cor precisam de um valor válido.")
    if not campos:
        return {"ok": True}
    sets = ", ".join(f"{k} = %s" for k in campos)
    try:
        await db.executar(f"update contas set {sets} where id = %s", (*campos.values(), e["conta_id"]))
    except UniqueViolation:
        raise HTTPException(409, "Esse identificador já está em uso. Escolha outro.")
    return {"ok": True}


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
