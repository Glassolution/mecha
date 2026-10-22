"""Capas: em disco no computador; no Supabase Storage quando há a chave secreta (o disco do servidor grátis some)."""

import httpx
import pytest
from pydantic import SecretStr

from radar.armazenamento import copiar_capa, url_capa
from radar.config import config

JPG = b"\xff\xd8\xff\xe0capa"


def _cliente(pedidos: list[httpx.Request]) -> httpx.AsyncClient:
    def responder(req: httpx.Request) -> httpx.Response:
        pedidos.append(req)
        if req.url.host == "cdn.tiktok.com":
            return httpx.Response(200, content=JPG, headers={"content-type": "image/jpeg"})
        return httpx.Response(200, json={"Key": "capas/x.jpg"})

    return httpx.AsyncClient(transport=httpx.MockTransport(responder))


@pytest.fixture
def com_storage(monkeypatch):
    monkeypatch.setattr(config(), "supabase_secret_key", SecretStr("sb_secret_teste"))


async def test_sem_chave_fica_em_disco():
    pedidos: list[httpx.Request] = []
    async with _cliente(pedidos) as cli:
        nome = await copiar_capa(cli, "tt:disco1", "https://cdn.tiktok.com/capa.jpg")
    assert nome == "tt_disco1.jpg"
    assert (config().pasta_capas / nome).read_bytes() == JPG
    assert url_capa(nome) == "/api/capas/tt_disco1.jpg"
    assert [p.url.host for p in pedidos] == ["cdn.tiktok.com"]


async def test_com_chave_vai_para_o_storage(com_storage):
    pedidos: list[httpx.Request] = []
    async with _cliente(pedidos) as cli:
        nome = await copiar_capa(cli, "tt:nuvem1", "https://cdn.tiktok.com/capa.jpg")
    assert nome == "tt_nuvem1.jpg"
    assert not (config().pasta_capas / nome).exists()
    envio = pedidos[-1]
    assert str(envio.url) == "https://teste.supabase.co/storage/v1/object/capas/tt_nuvem1.jpg"
    assert envio.headers["apikey"] == "sb_secret_teste"
    assert "authorization" not in envio.headers  # a chave nova não é JWT
    assert envio.content == JPG
    assert url_capa(nome) == "https://teste.supabase.co/storage/v1/object/public/capas/tt_nuvem1.jpg"


async def test_storage_recusou_fica_sem_capa(com_storage):
    def responder(req: httpx.Request) -> httpx.Response:
        if req.url.host == "cdn.tiktok.com":
            return httpx.Response(200, content=JPG, headers={"content-type": "image/jpeg"})
        return httpx.Response(403, json={"error": "Unauthorized"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(responder)) as cli:
        assert await copiar_capa(cli, "tt:nuvem2", "https://cdn.tiktok.com/capa.jpg") is None


async def test_endereco_antigo_da_capa_redireciona(com_storage):
    from radar.main import app

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as anonimo:
        r = await anonimo.get("/api/capas/tt_nuvem1.jpg")
        assert r.status_code == 301
        assert r.headers["location"] == "https://teste.supabase.co/storage/v1/object/public/capas/tt_nuvem1.jpg"
        assert (await anonimo.get("/api/capas/..%2Fsegredo")).status_code == 404
