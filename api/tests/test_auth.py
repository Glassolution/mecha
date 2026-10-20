"""Login pelo Supabase: tokens assinados por uma chave de teste (nada toca o Supabase de verdade)."""

import time
import uuid

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from radar import auth, db
from radar.main import app

CHAVE = ec.generate_private_key(ec.SECP256R1())
OUTRA = ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(autouse=True)
def chave_de_teste(monkeypatch):
    monkeypatch.setattr(auth, "_chave_para", lambda token: CHAVE.public_key())


def token(email: str, sub: str | None = None, chave=CHAVE, **extra) -> str:
    agora = int(time.time())
    dados = {
        "sub": sub or str(uuid.uuid4()), "email": email, "aud": "authenticated",
        "iss": "https://teste.supabase.co/auth/v1", "iat": agora, "exp": agora + 3600, "role": "authenticated",
        **extra,
    }
    return jwt.encode(dados, chave, algorithm="ES256")


@pytest.fixture
async def anonimo():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        yield c


async def test_primeiro_login_cria_conta_e_espaco_no_gratis(anonimo):
    sub = str(uuid.uuid4())
    h = {"Authorization": f"Bearer {token('ana@exemplo.com', sub)}"}
    eu = (await anonimo.get("/api/eu", headers=h)).json()
    assert eu["conta"]["email"] == "ana@exemplo.com"
    assert eu["plano"]["id"] == "gratis"
    # segundo pedido: mesma conta, sem criar outro espaço
    await anonimo.get("/api/eu", headers=h)
    n = await db.um("select count(*) as n from membros m join contas c on c.id = m.conta_id where c.auth_id = %s", (sub,))
    assert n["n"] == 1


async def test_token_assinado_por_outra_chave_nao_entra(anonimo):
    r = await anonimo.get("/api/eu", headers={"Authorization": f"Bearer {token('x@exemplo.com', chave=OUTRA)}"})
    assert r.status_code == 401


async def test_token_vencido_nao_entra(anonimo):
    vencido = token("x@exemplo.com", exp=int(time.time()) - 10)
    assert (await anonimo.get("/api/eu", headers={"Authorization": f"Bearer {vencido}"})).status_code == 401


async def test_token_de_outro_projeto_nao_entra(anonimo):
    outro = token("x@exemplo.com", iss="https://outro.supabase.co/auth/v1")
    assert (await anonimo.get("/api/eu", headers={"Authorization": f"Bearer {outro}"})).status_code == 401


async def test_dono_herda_o_espaco_do_computador_e_fica_no_pro(cliente, anonimo):
    # o espaço de desenvolvimento (criado pelo login local) tem uma coleção
    await db.executar("update espacos set plano = 'gratis'")
    col = (await cliente.post("/api/colecoes", json={"nome": "Minhas referências"})).json()
    h = {"Authorization": f"Bearer {token('Dono@Teste.com')}"}
    eu = (await anonimo.get("/api/eu", headers=h)).json()
    assert eu["plano"]["id"] == "pro" and eu["conta"]["email"] == "dono@teste.com"
    cols = (await anonimo.get("/api/colecoes", headers=h)).json()
    assert [str(c["id"]) for c in cols] == [str(col["id"])]


async def test_cookie_local_so_vale_nos_testes(cliente, monkeypatch):
    from radar.config import config

    assert (await cliente.get("/api/eu")).status_code == 200
    monkeypatch.setattr(config(), "ambiente", "dev")
    assert (await cliente.get("/api/eu")).status_code == 401


async def test_inicio_abre_sem_login(anonimo):
    from radar.biblioteca import gravar_video

    from conftest import video_simulado

    async with db.conexao() as con:
        await gravar_video(con, video_simulado(1), "ai tool")
        await con.execute("update videos set capa_path = 'tt_sim1.jpg'")
    assert (await anonimo.get("/api/publico/resumo")).json()["videos_total"] == 1
    itens = (await anonimo.get("/api/publico/em-alta")).json()["itens"]
    assert [v["id"] for v in itens] == ["tt:sim1"]
    # o resto continua fechado
    assert (await anonimo.get("/api/videos")).status_code == 401
    assert (await anonimo.post("/api/garimpos", json={"termos": ["x"]})).status_code == 401


async def test_quiz_salva_perfil_nome_e_meu_saas(anonimo):
    h = {"Authorization": f"Bearer {token('bia@exemplo.com')}"}
    eu = (await anonimo.get("/api/eu", headers=h)).json()
    assert eu["espaco"]["boas_vindas_ok"] is False and eu["meu_saas"] is None
    r = await anonimo.patch("/api/espaco", headers=h, json={
        "meu_nome": "Bia", "perfil": "founder", "objetivo": "criativos", "nichos": ["saude", "inexistente"],
        "ver_ingles": True, "boas_vindas_ok": True, "nome": "Clinix",
    })
    assert r.status_code == 200
    assert (await anonimo.put("/api/meu-saas", headers=h, json={"nome": "Clinix", "tipo": "saas", "link": "clinix.com.br", "o_que_faz": "Agenda para clínicas"})).status_code == 200
    assert (await anonimo.put("/api/meu-saas", headers=h, json={"nome": "X", "tipo": "cassino"})).status_code == 422
    eu = (await anonimo.get("/api/eu", headers=h)).json()
    assert eu["conta"]["nome"] == "Bia"
    assert eu["espaco"]["perfil"] == "founder" and eu["espaco"]["objetivo"] == "criativos"
    assert eu["espaco"]["interesse"] == "achar_criativo" and eu["espaco"]["nichos"] == ["saude"]
    assert eu["espaco"]["boas_vindas_ok"] is True and eu["espaco"]["nome"] == "Clinix"
    assert eu["meu_saas"] == {"nome": "Clinix", "tipo": "saas", "link": "https://clinix.com.br", "o_que_faz": "Agenda para clínicas"}
    r = await anonimo.patch("/api/espaco", headers=h, json={"perfil": "hacker"})
    assert r.status_code == 422
