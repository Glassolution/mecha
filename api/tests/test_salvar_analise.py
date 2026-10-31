"""Análises nas pastas: persistência, isolamento e recuperação sem chamar IA."""
from uuid import uuid4

from psycopg.types.json import Jsonb

from radar import db
from test_analise import RESULTADO, _video


async def _conversa(espaco_id, video_id, texto="Análise privada do catálogo.\n\nPrimeiro teste com lojistas."):
    await db.executar(
        """insert into conversas_video (espaco_id, video_id, pedido_id, pergunta, resposta, modelo, custo_tokens)
           values (%s, %s, %s, 'Analise este vídeo', %s, 'teste', 0)""",
        (espaco_id, video_id, uuid4(), texto),
    )


async def test_salva_analise_separada_do_video_e_reabre_historico(cliente):
    vid = await _video()
    eu = (await cliente.get("/api/eu")).json()
    await _conversa(eu["espaco"]["id"], vid)
    col = (await cliente.post("/api/colecoes", json={"nome": "Oportunidades"})).json()
    pedido = {"colecao_id": str(col["id"]), "item_tipo": "analise", "item_id": vid}
    assert (await cliente.post("/api/salvos", json=pedido)).status_code == 200
    assert (await cliente.post("/api/salvos", json=pedido)).status_code == 200
    detalhe = (await cliente.get(f"/api/colecoes/{col['id']}")).json()
    assert len(detalhe["itens"]) == 1
    item = detalhe["itens"][0]
    assert item["tipo"] == "analise" and item["video"]["id"] == vid
    assert "Análise privada" in item["resumo"]
    assert (await cliente.get("/api/salvos/onde", params={"item_tipo": "analise", "item_id": vid})).json() == [str(col["id"])]
    assert (await cliente.get("/api/colecoes")).json()[0]["itens"] == 1
    csv = await cliente.get(f"/api/colecoes/{col['id']}/planilha.csv")
    assert csv.status_code == 200 and "Primeiro teste com lojistas." in csv.text
    assert (await cliente.post("/api/salvos", json={**pedido, "item_tipo": "video"})).status_code == 200
    assert (await cliente.delete(f"/api/salvos/{col['id']}/analise/{vid}")).status_code == 200
    itens = (await cliente.get(f"/api/colecoes/{col['id']}")).json()["itens"]
    assert len(itens) == 1 and itens[0]["tipo"] == "video"
    historico = (await cliente.get(f"/api/videos/{vid}/conversa")).json()
    assert len(historico) == 2 and "Análise privada" in historico[1]["texto"]


async def test_nao_salva_analise_inexistente_ou_de_outro_espaco(cliente):
    vid = await _video()
    col = (await cliente.post("/api/colecoes", json={"nome": "Minhas análises"})).json()
    pedido = {"colecao_id": str(col["id"]), "item_tipo": "analise", "item_id": vid}
    assert (await cliente.post("/api/salvos", json=pedido)).status_code == 409
    conta = await db.um("insert into contas (email,nome) values ('outra-analise@teste.com','Outra') returning id")
    espaco = await db.um("insert into espacos (dono_id,nome,plano) values (%s,'Outro','pro') returning id", (conta["id"],))
    await _conversa(espaco["id"], vid, "Segredo do outro espaço")
    assert (await cliente.post("/api/salvos", json=pedido)).status_code == 409
    assert (await cliente.get(f"/api/colecoes/{col['id']}")).json()["itens"] == []
    outra = await db.um("insert into colecoes (espaco_id,nome) values (%s,'Privada') returning id", (espaco["id"],))
    assert (await cliente.get(f"/api/colecoes/{outra['id']}")).status_code == 404
    assert (await cliente.post("/api/salvos", json={**pedido, "colecao_id": str(outra["id"])})).status_code == 404
    assert (await cliente.get("/api/salvos/onde", params={"item_tipo": "analise", "item_id": vid})).json() == []


async def test_salva_analise_anterior_sem_conversa(cliente):
    vid = await _video()
    eu = (await cliente.get("/api/eu")).json()
    await db.executar(
        "insert into analises_video (espaco_id,video_id,resultado,modelo,custo_tokens) values (%s,%s,%s,'teste',0)",
        (eu["espaco"]["id"], vid, Jsonb(RESULTADO)),
    )
    col = (await cliente.post("/api/colecoes", json={"nome": "Análises anteriores"})).json()
    assert (await cliente.post("/api/salvos", json={"colecao_id": str(col["id"]), "item_tipo": "analise", "item_id": vid})).status_code == 200
    item = (await cliente.get(f"/api/colecoes/{col['id']}")).json()["itens"][0]
    assert item["tipo"] == "analise" and RESULTADO["titulo"] in item["resumo"]


async def test_salvar_analise_exige_sessao(cliente):
    cliente.cookies.clear()
    assert (await cliente.post("/api/salvos", json={"colecao_id": str(uuid4()), "item_tipo": "analise", "item_id": "tt:sim1"})).status_code == 401
