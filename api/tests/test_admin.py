"""O painel global não pode depender da visibilidade do link nem de campos editáveis."""

import httpx
import pytest

from radar import auth, db
from radar.admin import EMAIL_ADMIN
from radar.main import app
from test_auth import CHAVE, OUTRA, token


@pytest.fixture
async def visitante(monkeypatch):
    monkeypatch.setattr(auth, "_chave_para", lambda _: CHAVE.public_key())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        yield c


async def test_admin_exige_sessao_e_assinatura_valida(visitante, cliente):
    assert (await visitante.get("/api/admin/painel")).status_code == 401
    # Nem o cookie local de teste é uma credencial de administrador.
    assert (await cliente.get("/api/admin/painel")).status_code == 403
    r = await visitante.get("/api/admin/painel", headers={"Authorization": f"Bearer {token(EMAIL_ADMIN, chave=OUTRA)}"})
    assert r.status_code == 401


async def test_outro_email_nao_acessa_nem_fingindo_metadados(visitante):
    for email in ("outra@exemplo.com", "xavierluisfelipe12+admin@gmail.com", EMAIL_ADMIN+".outro.com"):
        h = {"Authorization": f"Bearer {token(email, user_metadata={'admin': True, 'email': EMAIL_ADMIN})}"}
        assert (await visitante.get("/api/eu", headers=h)).json()["admin"] is False
        assert (await visitante.get("/api/admin/painel", headers=h)).status_code == 403


async def test_email_no_banco_nao_concede_privilegio(visitante):
    h = {"Authorization": f"Bearer {token('usuario@exemplo.com')}"}
    await visitante.get("/api/eu", headers=h)
    await db.executar("update contas set email=%s", (EMAIL_ADMIN,))
    assert (await visitante.get("/api/admin/painel", headers=h)).status_code == 403


async def test_admin_tem_dados_reais_e_serie_com_dias_vazios(visitante):
    h = {"Authorization": f"Bearer {token(EMAIL_ADMIN.upper())}"}
    eu = (await visitante.get("/api/eu", headers=h)).json()
    assert eu["admin"] is True
    espaco = eu["espaco"]["id"]
    # Um plano concedido manualmente não é evidência de uma assinatura paga.
    await db.executar("update espacos set plano='pro' where id=%s", (espaco,))
    await db.executar("insert into contas(email,nome,criado_em) values ('antiga@exemplo.com','Antiga',now()-interval '12 days')")
    await db.executar("insert into garimpos(espaco_id,termos,status,vistos) values (%s,'{clinica}','concluido',12)", (espaco,))
    await db.executar("insert into garimpos(espaco_id,termos,status) values (%s,'{saas}','erro')", (espaco,))
    await db.executar("insert into garimpos(espaco_id,termos,status,criado_em) values (%s,'{antigo}','concluido',now()-interval '12 days')", (espaco,))
    r = await visitante.get("/api/admin/painel?dias=7", headers=h)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "private, no-store"
    p = r.json()
    assert p["faturamento"] == {"status": "nao_configurado", "moeda": "BRL", "recebido_centavos": None,
                                "mrr_centavos": None, "assinaturas_ativas": None}
    assert p["totais"]["usuarios"] == 2
    assert p["totais"]["usuarios_periodo"] == 1
    assert p["totais"]["usuarios_anterior"] == 1
    assert p["totais"]["garimpos"] == 2
    assert p["totais"]["concluidos"] == 1 and p["totais"]["erros"] == 1
    assert len(p["serie"]) == 7
    assert sum(d["garimpos"] for d in p["serie"]) == 2
    assert sum(d["usuarios"] for d in p["serie"]) == 1
    assert len(p["usuarios"]) == 2 and len(p["garimpos"]) == 3
    assert {a["tipo"] for a in p["atividade"]} == {"cadastro", "garimpo"}
    p30 = (await visitante.get("/api/admin/painel?dias=30", headers=h)).json()
    assert len(p30["serie"]) == 30 and p30["totais"]["garimpos"] == 3
    assert (await visitante.get("/api/admin/painel?dias=999", headers=h)).status_code == 422
