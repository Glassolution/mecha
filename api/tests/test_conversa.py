"""Conversa com provedor substituído e PostgreSQL de testes."""
import asyncio
from uuid import uuid4

import httpx
import pytest
from fastapi import Response

from radar import analise, db, sessao
from radar.config import config
from radar.main import app
from test_analise import _video
from test_oportunidades import falso_gemini


def pergunta(texto="O que vale validar?"):
    return {"pedido_id": str(uuid4()), "texto": texto}


async def test_historico_e_reenvio_idempotente(cliente, monkeypatch):
    vid = await _video()
    chamadas = []
    async def responder(v, espaco, meu, historico, texto, anterior):
        chamadas.append((v, historico, texto))
        return f"Resposta baseada no vídeo: {texto}", 123
    monkeypatch.setattr(analise, "conversar", responder)
    p, caminho = pergunta(), f"/api/videos/{vid}/conversa"
    assert (await cliente.get(caminho)).json() == []
    r = await cliente.post(caminho, json=p)
    assert r.status_code == 200
    assert [m["papel"] for m in r.json()] == ["user", "assistant"]
    assert (await cliente.post(caminho, json=p)).json() == r.json()
    assert len(chamadas) == 1
    assert chamadas[0][0]["transcricao"] and chamadas[0][0]["views"]
    assert chamadas[0][1] == []
    assert (await cliente.post(caminho, json=pergunta("E os riscos?"))).status_code == 200
    assert chamadas[1][1][0]["pergunta"] == p["texto"]
    assert chamadas[1][1][0]["resposta"] == r.json()[1]["texto"]
    assert len((await cliente.get(caminho)).json()) == 4
    assert (await cliente.post(caminho, json={**p, "texto": "Outra pergunta"})).status_code == 409


async def test_falha_nao_grava_e_permite_repetir(cliente, monkeypatch):
    vid = await _video()
    async def falhar(*args):
        raise analise.SemChave()
    monkeypatch.setattr(analise, "conversar", falhar)
    p, caminho = pergunta(), f"/api/videos/{vid}/conversa"
    r = await cliente.post(caminho, json=p)
    assert r.status_code == 409 and "conectada" in r.json()["mensagem"]
    assert (await cliente.get(caminho)).json() == []
    async def responder(*args):
        return "Agora está disponível.", 10
    monkeypatch.setattr(analise, "conversar", responder)
    assert (await cliente.post(caminho, json=p)).status_code == 200


async def test_limite_e_concorrencia(cliente, monkeypatch):
    vid = await _video()
    iniciou, liberar = asyncio.Event(), asyncio.Event()
    async def responder(*args):
        iniciou.set()
        await liberar.wait()
        return "Resposta completa.", 10
    monkeypatch.setattr(analise, "conversar", responder)
    caminho = f"/api/videos/{vid}/conversa"
    primeira = asyncio.create_task(cliente.post(caminho, json=pergunta()))
    try:
        await asyncio.wait_for(iniciou.wait(), 3)
        assert (await cliente.post(caminho, json=pergunta())).status_code == 409
    finally:
        liberar.set()
    assert (await primeira).status_code == 200
    monkeypatch.setattr(config(), "mensagens_chat_por_dia", 1)
    assert (await cliente.post(caminho, json=pergunta())).status_code == 429


async def test_isola_espaco_e_video(cliente, monkeypatch):
    vid = await _video()
    async def responder(*args):
        return "Conversa privada do espaço.", 10
    monkeypatch.setattr(analise, "conversar", responder)
    assert (await cliente.post(f"/api/videos/{vid}/conversa", json=pergunta())).status_code == 200
    assert (await cliente.get("/api/videos/tt:outro/conversa")).json() == []
    conta = await db.um("insert into contas (email,nome) values ('outra@teste.com','Outra') returning id")
    espaco = await db.um("insert into espacos (dono_id,nome,plano) values (%s,'Outro','pro') returning id", (conta["id"],))
    await db.executar("insert into membros (espaco_id,conta_id,papel) values (%s,%s,'dono')", (espaco["id"], conta["id"]))
    response = Response()
    await sessao.criar(response, conta["id"])
    cookie = response.headers["set-cookie"].split(";", 1)[0]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste", headers={"cookie": cookie}) as outro:
        assert (await outro.get(f"/api/videos/{vid}/conversa")).json() == []


async def test_login_e_video_inexistente(cliente):
    assert (await cliente.post("/api/videos/tt:nada/conversa", json=pergunta())).status_code == 404
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        assert (await c.get("/api/videos/tt:nada/conversa")).status_code == 401
        assert (await c.post("/api/videos/tt:nada/conversa", json=pergunta())).status_code == 401


@pytest.mark.parametrize("texto", ["", "  \n ", "a" * 4001])
async def test_valida_pergunta(cliente, texto):
    assert (await cliente.post("/api/videos/tt:nada/conversa", json=pergunta(texto))).status_code == 422


async def test_provedor_recebe_contexto_e_historico(monkeypatch):
    recebidos = []
    falso_gemini(monkeypatch, {
        "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "Resposta fundamentada."}]}}],
        "usageMetadata": {"promptTokenCount": 12, "candidatesTokenCount": 8, "totalTokenCount": 20},
    }, recebidos)
    texto, gasto = await analise.conversar({"texto": "Legenda real", "transcricao": None}, {}, None,
        [{"pergunta": "Primeira", "resposta": "Anterior"}], "E agora?", {"resumo": "Análise salva"})
    assert texto == "Resposta fundamentada." and gasto == 20
    corpo = recebidos[0][1]
    assert "Legenda real" in corpo["contents"][0]["parts"][0]["text"]
    assert "Análise salva" in corpo["contents"][0]["parts"][0]["text"]
    assert corpo["contents"][-3:] == [{"role": "user", "parts": [{"text": "Primeira"}]},
                                      {"role": "model", "parts": [{"text": "Anterior"}]},
                                      {"role": "user", "parts": [{"text": "E agora?"}]}]
    assert "NÃO recebe o arquivo audiovisual" in corpo["systemInstruction"]["parts"][0]["text"]
    assert "tools" not in corpo


async def test_primeira_analise_busca_comentarios_e_segue_sem_eles_se_falhar(cliente, monkeypatch):
    from radar.coleta import comentarios

    vid = await _video()
    buscas, recebidos = [], []

    async def garantir(videos, por_video, provedores):
        buscas.append([v["id"] for v in videos])
        await db.executar("insert into comentarios_video (video_id, posicao, texto, curtidas) values (%s, 0, 'Onde eu baixo?', 40)", (vid,))
        return 0.01

    async def responder(v, espaco, meu, historico, texto, anterior):
        recebidos.append(v["lista_comentarios"])
        return "ok", 1

    monkeypatch.setattr(comentarios, "garantir", garantir)
    monkeypatch.setattr(analise, "conversar", responder)
    caminho = f"/api/videos/{vid}/conversa"
    assert (await cliente.post(caminho, json=pergunta())).status_code == 200
    # nas perguntas seguintes não busca de novo, mas continua mandando os comentários guardados
    assert (await cliente.post(caminho, json=pergunta("E os riscos?"))).status_code == 200
    assert buscas == [[vid]]
    assert recebidos == [[{"texto": "Onde eu baixo?", "curtidas": 40}]] * 2

    async def quebra(*a):
        raise RuntimeError("Apify fora do ar")

    monkeypatch.setattr(comentarios, "garantir", quebra)
    await db.executar("delete from conversas_video")
    await db.executar("delete from comentarios_video")
    assert (await cliente.post(caminho, json=pergunta())).status_code == 200
    assert recebidos[-1] == []


def test_comentarios_entram_nos_dados_do_video():
    dados = analise._video({"lista_comentarios": [{"texto": "Quero isso pro meu salão", "curtidas": 3}]})
    assert '"comentarios_do_publico": [{"texto": "Quero isso pro meu salão", "curtidas": 3}]' in dados


def test_proporcoes_para_julgar_o_criativo():
    p = analise._proporcoes({"views": 200_000, "likes": 10_000, "comentarios": 400, "compartilhamentos": 300,
                             "salvamentos": 2_000, "autor_seguidores": 10_000})
    assert p == {"curtidas_por_mil_views": 50.0, "comentarios_por_mil_views": 2.0, "compartilhamentos_por_mil_views": 1.5,
                 "salvamentos_por_mil_views": 10.0, "views_divididas_por_seguidores": 20.0}
    assert analise._proporcoes({"views": 10}) is None
