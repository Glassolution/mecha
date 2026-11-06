from radar import db
from radar.biblioteca import gravar_video
from conftest import video_simulado


async def test_rankings_contam_buscas_por_video_e_nicho_com_periodo(cliente):
    espaco = (await db.um("select id from espacos limit 1"))["id"]
    async with db.conexao() as con:
        for n in (1, 2):
            await gravar_video(con, video_simulado(n), "termo privado")
    await db.executar("update videos set nichos = '{saude}', sinal_software = true")
    for dias, dono, ids in [(0, espaco, [1, 2]), (0, espaco, [1]), (15, espaco, [2]), (0, None, [2])]:
        g = await db.um(
            "insert into garimpos (espaco_id, criado_em) values (%s, now() - %s * interval '1 day') returning id",
            (dono, dias),
        )
        for n in ids:
            await db.executar("insert into garimpo_videos (garimpo_id, video_id) values (%s, %s)", (g["id"], f"tt:sim{n}"))
    semana = await cliente.get("/api/publico/painel?dias=7")
    assert semana.status_code == 200
    dados = semana.json()
    assert [(v["id"], v["pesquisas"]) for v in dados["videos"]] == [("tt:sim1", 2), ("tt:sim2", 1)]
    assert dados["nichos"] == [{"id": "saude", "nome": "Saúde e medicina", "pesquisas": 2}]
    assert "termo privado" not in semana.text
    mes = (await cliente.get("/api/publico/painel?dias=30")).json()
    assert mes["nichos"][0]["pesquisas"] == 3
    assert all(v["pesquisas"] == 2 for v in mes["videos"])
    assert (await cliente.get("/api/publico/painel?dias=999")).status_code == 422


async def test_painel_sem_historico(cliente):
    resposta = await cliente.get("/api/publico/painel")
    assert resposta.status_code == 200
    assert resposta.json() == {"videos": [], "nichos": []}
