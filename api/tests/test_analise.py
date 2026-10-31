"""Análise de IA do vídeo: uma por espaço e vídeo, sem chamar o modelo de verdade nos testes."""

import httpx

from radar import analise, db
from radar.biblioteca import gravar_video
from radar.main import app
from conftest import video_simulado

RESULTADO = {
    "veredito": "vale", "nota": 72, "titulo": "IA que anota a consulta", "resumo": "r", "problema": "p", "publico": "pu",
    "encaixe": "e", "ideia": "i", "diferencial": "d", "sinais": ["s1", "s2"], "riscos": ["r1", "r2"],
    "licoes": [{"titulo": "l", "texto": "t"}], "momentos": [{"titulo": "m", "texto": "t"}], "primeiros_passos": ["a", "b", "c"],
}


async def _video():
    async with db.conexao() as con:
        await gravar_video(con, video_simulado(1), "ai notes")
    return "tt:sim1"


async def test_analisa_uma_vez_e_guarda(cliente, monkeypatch):
    vid = await _video()
    chamadas = []

    async def falso(v, espaco, meu):
        chamadas.append(v["id"])
        return RESULTADO, 1234

    monkeypatch.setattr(analise, "analisar", falso)
    assert (await cliente.get(f"/api/videos/{vid}/analise")).json() is None
    r = await cliente.post(f"/api/videos/{vid}/analise")
    assert r.status_code == 200 and r.json()["nota"] == 72 and r.json()["criado_em"]
    # pedir de novo devolve a mesma, sem gastar outra chamada
    assert (await cliente.post(f"/api/videos/{vid}/analise")).json()["titulo"] == RESULTADO["titulo"]
    assert (await cliente.get(f"/api/videos/{vid}/analise")).json()["veredito"] == "vale"
    assert chamadas == [vid]


async def test_sem_chave_avisa_sem_quebrar(cliente, monkeypatch):
    vid = await _video()

    async def sem_chave(v, espaco, meu):
        raise analise.SemChave()

    monkeypatch.setattr(analise, "analisar", sem_chave)
    r = await cliente.post(f"/api/videos/{vid}/analise")
    assert r.status_code == 409 and "ligada" in r.json()["mensagem"]


async def test_video_que_nao_existe(cliente):
    assert (await cliente.post("/api/videos/tt:nada/analise")).status_code == 404


async def test_precisa_de_login():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        assert (await c.post("/api/videos/tt:sim1/analise")).status_code == 401


async def test_analise_pede_json_no_esquema(monkeypatch):
    from test_oportunidades import falso_gemini
    import json
    recebidos = []
    falso_gemini(monkeypatch, {
        "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(RESULTADO)}]}}],
        "usageMetadata": {"totalTokenCount": 300},
    }, recebidos)
    resultado, gasto = await analise.analisar({"id": "tt:x", "texto": "Legenda"}, {}, None)
    assert resultado["nota"] == 72 and gasto == 300
    geracao = recebidos[0][1]["generationConfig"]
    assert geracao["responseMimeType"] == "application/json" and "veredito" in geracao["responseJsonSchema"]["properties"]
