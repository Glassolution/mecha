"""Analista de oportunidades com Apify e Gemini simulados."""

import json

import httpx
from fastapi import Response
from pydantic import SecretStr

from radar import db, fluxo, garimpo, gemini, oportunidades, sessao
from radar.coleta.comentarios import ComentariosApify
from radar.config import config
from radar.main import app
from conftest import ColetorSimulado
from test_garimpo import _criar


class ComentariosSimulados(ComentariosApify):
    """Apify falsa: devolve comentários no formato do actor do TikTok e conta as execuções."""

    def __init__(self):
        super().__init__("token-falso", "tiktok", "actor-falso", pausa_s=0)
        self.entradas: list[dict] = []

    async def _rodar(self, cli, entrada, deve_parar, teto_usd=None):
        self.entradas.append(entrada)
        itens = []
        for url in entrada["postURLs"]:
            itens += [
                {"videoWebUrl": url, "text": "Eu controlo tudo numa  planilha e perco horas toda semana", "diggCount": 40,
                 "uniqueId": "nao_guardar"},
                {"videoWebUrl": url, "text": "kkkkk", "diggCount": 1},
                {"videoWebUrl": url, "text": ""},
            ]
        return {"usageTotalUsd": 0.02}, itens


def resposta_do_modelo(video_id: str) -> dict:
    return {
        "nicho": "ai for doctors", "resumo": "Médicos perdem tempo com planilhas.",
        "dores": [
            {"titulo": "Controle em planilha", "descricao": "d", "forca_do_sinal": "baixa", "ideia_de_saas": "i",
             "por_que_software": "p", "evidencias": [
                 {"video_id": video_id, "comentario": "Eu controlo tudo numa planilha e perco horas..."},
                 {"video_id": video_id, "comentario": "Comentário que ninguém escreveu"},
                 {"video_id": "tt:inventado", "comentario": "kkkkk"},
             ]},
            {"titulo": "Dor sem prova", "descricao": "d", "forca_do_sinal": "alta", "ideia_de_saas": "i",
             "por_que_software": "p", "evidencias": [{"video_id": "tt:inventado", "comentario": "x"}]},
        ],
        "saas_existentes": [{"nome": "Ferramenta X", "o_que_faz": "o", "publico": "p", "preco": None,
                             "lacuna": "l", "url": "javascript:alert(1)"}],
        "limitacoes": "Poucos comentários.",
    }


async def _concluido(cliente) -> str:
    gid = await _criar(cliente)
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
    return gid


async def test_fluxo_completo_descarta_evidencia_inventada(cliente, monkeypatch):
    gid = await _concluido(cliente)
    pedidos = []

    async def gerar(modelo, sistema, conteudos, **kw):
        dados = json.loads(conteudos[0]["parts"][0]["text"])
        pedidos.append((dados, kw))
        topo = dados["videos"][0]
        return gemini.Resposta(texto=json.dumps(resposta_do_modelo(topo["id"])), tokens=5000, custo_usd=0.03, buscas=2)

    monkeypatch.setattr(gemini, "gerar", gerar)
    caminho = f"/api/garimpos/{gid}/oportunidades"
    assert (await cliente.get(caminho)).json() is None
    r = await cliente.post(caminho)
    assert r.status_code == 200 and r.json()["status"] == "analisando"

    apify = ComentariosSimulados()
    await oportunidades.rodar(gid, {"tiktok": apify})
    feito = (await cliente.get(caminho)).json()
    assert feito["status"] == "pronto"
    res = feito["resultado"]
    # só a evidência real sobrou; a dor sem nenhuma prova saiu
    assert [d["titulo"] for d in res["dores"]] == ["Controle em planilha"]
    ev = res["dores"][0]["evidencias"]
    assert len(ev) == 1 and ev[0]["comentario"] == "Eu controlo tudo numa planilha e perco horas toda semana"
    assert ev[0]["url"].startswith("https://www.tiktok.com/")
    assert res["evidencias_descartadas"] == 3
    assert res["saas_existentes"][0]["url"] is None
    # o modelo recebeu os comentários dos vídeos com mais views, sem o nome de quem comentou, e a busca na web
    dados, kw = pedidos[0]
    assert kw["buscar_na_web"] is True and kw["esquema"]["properties"]["dores"]
    assert dados["videos"][0]["comentarios"] and "nao_guardar" not in json.dumps(dados)
    assert len(apify.entradas[0]["postURLs"]) <= config().oportunidades_videos
    assert apify.entradas[0]["maxRepliesPerComment"] == 0
    linha = await db.um("select custo_usd from oportunidades_garimpo where garimpo_id = %s", (gid,))
    assert float(linha["custo_usd"]) == 0.05

    # pedir de novo devolve a mesma, sem outra fila; comentários de até 7 dias são reaproveitados
    assert (await cliente.post(caminho)).json()["status"] == "pronto"
    await db.executar("update oportunidades_garimpo set status = 'erro' where garimpo_id = %s", (gid,))
    assert (await cliente.post(caminho)).json()["status"] == "analisando"
    await oportunidades.rodar(gid, {"tiktok": apify})
    assert len(apify.entradas) == 1


async def test_so_com_busca_concluida_e_limite_por_dia(cliente, monkeypatch):
    gid = await _criar(cliente)
    r = await cliente.post(f"/api/garimpos/{gid}/oportunidades")
    assert r.status_code == 409 and "terminar" in r.json()["mensagem"]
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
    monkeypatch.setattr(config(), "oportunidades_por_dia", 0)
    assert (await cliente.post(f"/api/garimpos/{gid}/oportunidades")).status_code == 429


async def test_erro_do_modelo_fica_registrado_e_pode_refazer(cliente, monkeypatch):
    gid = await _concluido(cliente)

    async def sem_chave(*a, **kw):
        raise gemini.SemChave()

    monkeypatch.setattr(gemini, "gerar", sem_chave)
    await cliente.post(f"/api/garimpos/{gid}/oportunidades")
    await oportunidades.rodar(gid, {})
    feito = (await cliente.get(f"/api/garimpos/{gid}/oportunidades")).json()
    assert feito["status"] == "erro" and "ligada" in feito["erro"]
    await fluxo.redis().flushdb()
    assert (await cliente.post(f"/api/garimpos/{gid}/oportunidades")).json()["status"] == "analisando"
    assert await fluxo.redis().keys("arq:job:*")


async def test_garimpo_de_outro_espaco(cliente):
    gid = await _concluido(cliente)
    conta = await db.um("insert into contas (email,nome) values ('outra@teste.com','Outra') returning id")
    espaco = await db.um("insert into espacos (dono_id,nome,plano) values (%s,'Outro','pro') returning id", (conta["id"],))
    await db.executar("insert into membros (espaco_id,conta_id,papel) values (%s,%s,'dono')", (espaco["id"], conta["id"]))
    response = Response()
    await sessao.criar(response, conta["id"])
    cookie = response.headers["set-cookie"].split(";", 1)[0]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste", headers={"cookie": cookie}) as outro:
        assert (await outro.get(f"/api/garimpos/{gid}/oportunidades")).status_code == 404
        assert (await outro.post(f"/api/garimpos/{gid}/oportunidades")).status_code == 404


def falso_gemini(monkeypatch, corpo: dict, recebidos: list):
    def tratar(pedido: httpx.Request) -> httpx.Response:
        recebidos.append((pedido, json.loads(pedido.content)))
        return httpx.Response(200, json=corpo)

    original = httpx.AsyncClient
    monkeypatch.setattr(config(), "gemini_api_key", SecretStr("chave-falsa-do-teste"))
    monkeypatch.setattr(gemini.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(tratar), **kw))


async def test_gemini_rest_com_busca_e_custo(monkeypatch):
    recebidos = []
    falso_gemini(monkeypatch, {
        "candidates": [{"finishReason": "STOP", "content": {"parts": [
            {"text": "pensando", "thought": True}, {"text": '```json\n{"ok": true}\n```'}]},
            "groundingMetadata": {"webSearchQueries": ["a", "b"]}}],
        "usageMetadata": {"promptTokenCount": 1_000_000, "candidatesTokenCount": 100_000, "totalTokenCount": 1_100_000},
    }, recebidos)
    r = await gemini.gerar("gemini-3.5-flash", "sistema", [{"role": "user", "parts": [{"text": "oi"}]}],
                           esquema={"type": "object"}, buscar_na_web=True)
    assert gemini.json_da_resposta(r.texto) == {"ok": True}
    assert r.buscas == 2 and round(r.custo_usd, 3) == round(1.5 + 0.9 + 0.028, 3)
    pedido, corpo = recebidos[0]
    assert pedido.headers["x-goog-api-key"] == "chave-falsa-do-teste" and "key=" not in str(pedido.url)
    assert corpo["tools"] == [{"google_search": {}}]
    assert corpo["generationConfig"]["responseMimeType"] == "application/json"


async def test_gemini_sem_chave(monkeypatch):
    monkeypatch.setattr(config(), "gemini_api_key", None)
    try:
        await gemini.gerar("m", "s", [])
    except gemini.SemChave:
        return
    raise AssertionError("devia avisar que falta a chave")


def test_esquema_sem_referencias():
    texto = json.dumps(gemini.esquema(oportunidades.Oportunidades))
    assert "$ref" not in texto and "$defs" not in texto and "forca_do_sinal" in texto
