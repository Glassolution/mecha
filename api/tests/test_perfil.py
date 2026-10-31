"""Cadastro da conta: identidade única, validação e contato restrito ao próprio usuário."""

import httpx
import pytest

from radar import db
from radar.main import app


async def test_identidade_e_avatar_ficam_salvos_na_conta(cliente):
    r = await cliente.patch("/api/conta", json={
        "nome": "  Ana Silva  ", "identificador": "Ana_Silva", "bio": "Um SaaS para clínicas",
        "whatsapp": "+55 (11) 98765-4321", "avatar": "pesquisando", "cor_perfil": "lilas", "cor_personagem": "menta",
    })
    assert r.status_code == 200
    conta = (await cliente.get("/api/eu")).json()["conta"]
    assert conta["nome"] == "Ana Silva"
    assert conta["identificador"] == "ana_silva"
    assert conta["bio"] == "Um SaaS para clínicas"
    assert conta["whatsapp"] == "+5511987654321"
    assert conta["avatar"] == "pesquisando" and conta["cor_perfil"] == "lilas"
    assert conta["cor_personagem"] == "menta"
    assert conta["criado_em"]
    # Atualizar apenas a cor preserva os dados já preenchidos.
    await cliente.patch("/api/conta", json={"cor_perfil": "amarelo"})
    atual = (await cliente.get("/api/eu")).json()["conta"]
    assert atual["whatsapp"] == conta["whatsapp"] and atual["identificador"] == conta["identificador"]
    assert atual["cor_personagem"] == "menta" and atual["cor_perfil"] == "amarelo"
    await cliente.patch("/api/conta", json={"cor_personagem":"rosa"})
    cores = (await cliente.get("/api/eu")).json()["conta"]
    assert cores["cor_personagem"] == "rosa" and cores["cor_perfil"] == "amarelo"
    await cliente.patch("/api/conta", json={"whatsapp": None, "bio": None})
    limpa = (await cliente.get("/api/eu")).json()["conta"]
    assert limpa["whatsapp"] is None and limpa["bio"] is None


async def test_identificador_unico_sem_expor_contato(cliente):
    await db.executar("insert into contas (email, nome, identificador, whatsapp) values ('outra@teste.local', 'Outra pessoa', 'reservado', '+5511912345678')")
    livre = await cliente.get("/api/conta/identificador?valor=disponivel")
    assert livre.json() == {"disponivel": True}
    ocupado = await cliente.get("/api/conta/identificador?valor=reservado")
    assert ocupado.json() == {"disponivel": False}
    antes = (await cliente.get("/api/eu")).json()["conta"]["nome"]
    r = await cliente.patch("/api/conta", json={"identificador": "RESERVADO", "nome": "Não deve salvar"})
    assert r.status_code == 409
    assert (await cliente.get("/api/eu")).json()["conta"]["nome"] == antes
    assert (await cliente.get("/api/eu")).json()["conta"]["whatsapp"] is None


async def test_o_proprio_identificador_continua_disponivel(cliente):
    await cliente.patch("/api/conta", json={"identificador":"meu_perfil"})
    assert (await cliente.get("/api/conta/identificador?valor=meu_perfil")).json() == {"disponivel":True}


@pytest.mark.parametrize("dados", [
    {"nome":"   "}, {"nome":None}, {"identificador":"ab"}, {"identificador":"nome com espaço"},
    {"identificador":"../../outro"}, {"identificador":"x"*31}, {"bio":"a"*81},
    {"whatsapp":"ligue amanhã"}, {"whatsapp":"123"}, {"whatsapp":"1"*16},
    {"avatar":"../../foto"}, {"avatar":None}, {"cor_perfil":"#000"},
    {"cor_personagem":"#000"}, {"cor_personagem":None}, {"cor_perfil":None},
])
async def test_recusa_dados_invalidos(cliente, dados):
    assert (await cliente.patch("/api/conta", json=dados)).status_code == 422


async def test_cadastro_exige_login():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        assert (await c.patch("/api/conta", json={"nome":"Ana"})).status_code == 401
        assert (await c.get("/api/conta/identificador?valor=reservado")).status_code == 401
