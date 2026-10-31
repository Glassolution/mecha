"""Catálogo exibido no modal: preços confirmados, limites reais e acesso autenticado."""

import httpx

from radar.main import app
from radar.planos import PLANOS


async def test_catalogo_de_planos(cliente):
    antes = (await cliente.get("/api/eu")).json()["plano"]
    r = await cliente.get("/api/planos")
    assert r.status_code == 200
    catalogo = r.json()
    assert catalogo["moeda"] == "BRL" and catalogo["periodicidade"] == "mensal"
    assert catalogo["contratacao_disponivel"] is False
    planos = {p["id"]: p for p in catalogo["itens"]}
    assert set(planos) == {"gratis", "pro", "agencia"}
    assert [planos[p]["preco_mensal_centavos"] for p in ("gratis", "pro", "agencia")] == [0, 4990, 7990]
    for id, plano in planos.items():
        assert plano["garimpos"] == PLANOS[id]["garimpos"]
        assert plano["itens_completos"] == PLANOS[id]["itens_completos"]
    assert (await cliente.get("/api/eu")).json()["plano"] == antes


async def test_catalogo_exige_login():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as cliente:
        assert (await cliente.get("/api/planos")).status_code == 401
