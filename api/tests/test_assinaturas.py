"""Assinaturas pelo Asaas: um Asaas falso grava os pedidos; o plano só muda pelos avisos (webhooks)."""

from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from pydantic import SecretStr

from radar import asaas, assinaturas, db
from radar.config import config
from radar.main import app

TOKEN = "token-de-teste-com-mais-de-32-caracteres-123"
CPF = "529.982.247-25"  # CPF de exemplo válido


class AsaasFalso:
    def __init__(self):
        self.pedidos: list[tuple[str, str, dict | None]] = []
        self.assinaturas: dict[str, dict] = {}
        self.falhar: dict[str, asaas.ErroAsaas] = {}

    async def pedir(self, metodo, caminho, json=None, params=None):
        self.pedidos.append((metodo, caminho, json))
        chave = f"{metodo} {caminho.split('/')[1]}"
        if chave in self.falhar:
            raise self.falhar.pop(chave)
        if (metodo, caminho) == ("POST", "/customers"):
            return {"id": "cus_1"}
        if metodo == "PUT" and caminho.startswith("/customers/"):
            return {"id": caminho.split("/")[2]}
        if (metodo, caminho) == ("POST", "/subscriptions"):
            sid = f"sub_{len(self.assinaturas) + 1}"
            self.assinaturas[sid] = {"id": sid, **json}
            return {"id": sid}
        if metodo == "GET" and caminho == "/subscriptions":
            ref = params["externalReference"]
            return {"data": [s for s in self.assinaturas.values() if s["externalReference"] == ref]}
        if metodo == "GET" and caminho.endswith("/payments"):
            sid = caminho.split("/")[2]
            return {"data": [{"id": f"pay_{sid}", "status": "PENDING", "dueDate": "2026-10-31",
                              "invoiceUrl": f"https://sandbox.asaas.com/i/{sid}"}]}
        return {}


@pytest.fixture
def falso(monkeypatch):
    f = AsaasFalso()
    monkeypatch.setattr(asaas, "pedir", f.pedir)
    monkeypatch.setattr(asaas, "configurado", lambda: True)
    monkeypatch.setattr(config(), "asaas_webhook_token", SecretStr(TOKEN))
    return f


async def _espaco(cliente) -> str:
    eu = (await cliente.get("/api/eu")).json()
    await db.executar("update espacos set plano = 'gratis' where id = %s", (eu["espaco"]["id"],))
    return eu["espaco"]["id"]


async def _aviso(cliente, evento: str, id_evento: str, **corpo) -> httpx.Response:
    return await cliente.post("/api/asaas/webhook", headers={"asaas-access-token": TOKEN},
                              json={"id": id_evento, "event": evento, **corpo})


def _pagamento(sid="sub_1", status="CONFIRMED", vencimento="2026-10-31", valor=49.9, **extra):
    return {"payment": {"id": f"pay_{sid}", "subscription": sid, "status": status, "value": valor,
                        "billingType": "PIX", "dueDate": vencimento, "paymentDate": vencimento, **extra}}


async def _plano(espaco) -> str:
    return (await db.um("select plano from espacos where id = %s", (espaco,)))["plano"]


def test_cpf_e_cnpj():
    assert assinaturas.documento_valido("52998224725")
    assert assinaturas.documento_valido("11222333000181")
    assert assinaturas.documento_valido("12ABC34501DE35")  # exemplo oficial do CNPJ alfanumérico
    assert not assinaturas.documento_valido("11111111111")
    assert not assinaturas.documento_valido("52998224726")
    assert not assinaturas.documento_valido("123")


def test_acesso_vai_um_mes_alem_do_vencimento_com_tolerancia():
    assert assinaturas.acesso_ate(date(2026, 1, 31)).date() == date(2026, 2, 28) + timedelta(days=3)
    assert assinaturas.acesso_ate(date(2026, 12, 15)).date() == date(2027, 1, 18)


async def test_assinar_devolve_fatura_sem_liberar_o_plano(cliente, falso):
    espaco = await _espaco(cliente)
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    assert r.status_code == 200
    assert r.json()["url"] == "https://sandbox.asaas.com/i/sub_1"
    criada = falso.assinaturas["sub_1"]
    assert criada["billingType"] == "PIX" and criada["value"] == 49.9 and criada["cycle"] == "MONTHLY"
    assert await _plano(espaco) == "gratis"  # só o aviso do Asaas libera
    eu = (await cliente.get("/api/eu")).json()
    assert eu["assinatura"]["status"] == "aguardando"
    assert eu["assinatura"]["link_pagamento"] == "https://sandbox.asaas.com/i/sub_1"

    # clicar de novo reaproveita o pedido em aberto
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    assert r.json()["url"] == "https://sandbox.asaas.com/i/sub_1"
    assert len(falso.assinaturas) == 1


async def test_documento_invalido_nem_chega_no_asaas(cliente, falso):
    await _espaco(cliente)
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": "111.111.111-11"})
    assert r.status_code == 422
    assert falso.pedidos == []


async def test_sem_resposta_do_asaas_recupera_pela_referencia(cliente, falso):
    await _espaco(cliente)
    falso.falhar["POST subscriptions"] = asaas.ErroAsaas(504, "sem resposta")
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    assert r.status_code == 502
    pendente = await db.um("select * from assinaturas")
    assert pendente["asaas_assinatura"] is None
    # o Asaas criou mesmo assim: a nova tentativa acha pela referência em vez de criar outra
    falso.assinaturas["sub_9"] = {"id": "sub_9", "externalReference": str(pendente["id"])}
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    assert r.json()["url"] == "https://sandbox.asaas.com/i/sub_9"
    assert len([p for p in falso.pedidos if p[:2] == ("POST", "/subscriptions")]) == 1


async def test_webhook_exige_token(cliente, falso):
    r = await cliente.post("/api/asaas/webhook", headers={"asaas-access-token": "errado"},
                           json={"id": "evt_1", "event": "PAYMENT_CONFIRMED"})
    assert r.status_code == 401
    assert (await cliente.post("/api/asaas/webhook", json={"id": "evt_1", "event": "X"})).status_code == 401


async def test_pagamento_confirmado_libera_e_aviso_repetido_nao_duplica(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    for _ in range(2):  # o Asaas pode reenviar o mesmo evento
        assert (await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())).status_code == 200
    await assinaturas.processar_pendentes()
    assert await _plano(espaco) == "pro"
    assert (await db.um("select count(*) as n from asaas_eventos"))["n"] == 1
    a = await db.um("select * from assinaturas")
    assert a["status"] == "ativa" and a["pago_ate"].astimezone(assinaturas.BRASILIA).date() == date(2026, 12, 3)
    eu = (await cliente.get("/api/eu")).json()
    assert eu["plano"]["id"] == "pro" and eu["assinatura"]["pode_reembolsar"] is True


async def test_reembolso_pela_pessoa_estorna_e_volta_ao_gratis(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "cartao", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())
    await assinaturas.processar_pendentes()
    r = await cliente.post("/api/assinatura/reembolsar")
    assert r.status_code == 200
    assert ("POST", "/payments/pay_sub_1/refund") in [p[:2] for p in falso.pedidos]
    assert ("DELETE", "/subscriptions/sub_1") in [p[:2] for p in falso.pedidos]
    assert await _plano(espaco) == "gratis"
    assert (await db.um("select status from assinaturas"))["status"] == "reembolsada"
    # o aviso de estorno que chega depois não muda nada
    await _aviso(cliente, "PAYMENT_REFUNDED", "evt_2", **_pagamento(status="REFUNDED"))
    await assinaturas.processar_pendentes()
    assert (await db.um("select status from asaas_eventos where id = 'evt_2'"))["status"] == "feito"


async def test_reembolso_pela_pessoa_so_nos_primeiros_dias(cliente, falso):
    await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())
    await assinaturas.processar_pendentes()
    await db.executar("update assinaturas set primeiro_pagamento_em = now() - interval '8 days'")
    assert (await cliente.post("/api/assinatura/reembolsar")).status_code == 403
    assert not [p for p in falso.pedidos if p[1].endswith("/refund")]


async def test_cancelar_mantem_ate_o_fim_do_periodo_e_depois_volta(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "agencia", "forma": "pix", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento(valor=79.9))
    await assinaturas.processar_pendentes()
    assert (await cliente.post("/api/assinatura/cancelar")).status_code == 200
    assert await _plano(espaco) == "agencia"
    await assinaturas.encerrar_vencidas()
    assert await _plano(espaco) == "agencia"
    await db.executar("update assinaturas set pago_ate = now() - interval '1 minute'")
    await assinaturas.encerrar_vencidas()
    assert await _plano(espaco) == "gratis"
    assert (await db.um("select status from assinaturas"))["status"] == "encerrada"


async def test_atrasada_depois_da_tolerancia_perde_o_acesso(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())
    await _aviso(cliente, "PAYMENT_OVERDUE", "evt_2",
                 payment={**_pagamento()["payment"], "id": "pay_2", "status": "OVERDUE", "dueDate": "2026-11-30"})
    await assinaturas.processar_pendentes()
    assert (await db.um("select status from assinaturas"))["status"] == "atrasada"
    await db.executar("update assinaturas set pago_ate = now() - interval '1 minute'")
    await assinaturas.encerrar_vencidas()
    assert await _plano(espaco) == "gratis"
    assert ("DELETE", "/subscriptions/sub_1") in [p[:2] for p in falso.pedidos]


async def test_chargeback_corta_na_hora(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "cartao", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())
    await _aviso(cliente, "PAYMENT_CHARGEBACK_REQUESTED", "evt_2", **_pagamento(status="CHARGEBACK_REQUESTED"))
    await assinaturas.processar_pendentes()
    assert await _plano(espaco) == "gratis"
    assert (await db.um("select status from assinaturas"))["status"] == "reembolsada"


async def test_trocar_de_plano_muda_o_valor_das_proximas(cliente, falso):
    espaco = await _espaco(cliente)
    await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento())
    await assinaturas.processar_pendentes()
    r = await cliente.post("/api/assinatura", json={"plano": "agencia", "forma": "pix", "documento": CPF})
    assert r.json() == {"url": None, "plano": "agencia"}
    assert ("PUT", "/subscriptions/sub_1", {"value": 79.9, "description": "Wae · plano Agência",
                                             "updatePendingPayments": True}) in falso.pedidos
    assert await _plano(espaco) == "agencia"
    assert (await cliente.post("/api/assinatura", json={"plano": "agencia", "forma": "pix", "documento": CPF})).status_code == 409


async def test_evento_de_assinatura_desconhecida_e_ignorado(cliente, falso):
    await _aviso(cliente, "PAYMENT_CONFIRMED", "evt_1", **_pagamento(sid="sub_de_outro_sistema"))
    await assinaturas.processar_pendentes()
    assert (await db.um("select status from asaas_eventos"))["status"] == "feito"
    assert (await db.um("select count(*) as n from pagamentos"))["n"] == 0


async def test_sem_chave_nao_oferece_assinatura(cliente):
    assert (await cliente.get("/api/planos")).json()["contratacao_disponivel"] is False
    r = await cliente.post("/api/assinatura", json={"plano": "pro", "forma": "pix", "documento": CPF})
    assert r.status_code == 503


async def test_painel_admin_reembolsa_e_mostra_receita(falso, monkeypatch):
    from radar import auth
    from radar.admin import EMAIL_ADMIN
    from test_auth import CHAVE, token

    monkeypatch.setattr(auth, "_chave_para", lambda _: CHAVE.public_key())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        pessoa = {"Authorization": f"Bearer {token('pessoa@exemplo.com')}"}
        admin = {"Authorization": f"Bearer {token(EMAIL_ADMIN)}"}
        espaco = (await c.get("/api/eu", headers=pessoa)).json()["espaco"]["id"]
        await c.post("/api/assinatura", headers=pessoa, json={"plano": "pro", "forma": "pix", "documento": CPF})
        await c.post("/api/asaas/webhook", headers={"asaas-access-token": TOKEN},
                     json={"id": "evt_1", "event": "PAYMENT_RECEIVED",
                           **_pagamento(paymentDate=datetime.now(timezone.utc).date().isoformat())})
        await assinaturas.processar_pendentes()
        painel = (await c.get("/api/admin/painel", headers=admin)).json()
        assert painel["faturamento"]["status"] == "conectado"
        assert painel["faturamento"]["mrr_centavos"] == 4990 and painel["faturamento"]["assinaturas_ativas"] == 1
        assert painel["faturamento"]["recebido_centavos"] == 4990
        linha = next(u for u in painel["usuarios"] if u["email"] == "pessoa@exemplo.com")
        assert linha["assinatura"]["pago"] is True
        # quem não é admin não reembolsa
        assert (await c.post(f"/api/admin/assinaturas/{linha['assinatura']['id']}/reembolsar", headers=pessoa)).status_code == 403
        r = await c.post(f"/api/admin/assinaturas/{linha['assinatura']['id']}/reembolsar", headers=admin)
        assert r.status_code == 200
        assert await _plano(espaco) == "gratis"
