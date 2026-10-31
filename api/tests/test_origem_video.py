"""Links antigos recuperam o garimpo do próprio espaço, nunca o de outra conta."""

from radar import db
from radar.biblioteca import gravar_video
from conftest import video_simulado


async def preparar_video():
    async with db.conexao() as con:
        await gravar_video(con, video_simulado(1), "ai tool")
    return "tt:sim1"


async def busca(espaco, video, antiga=False):
    g = await db.um("""insert into garimpos(espaco_id,criado_em) values
        (%s, now() - (%s * interval '1 day')) returning id""", (espaco, 2 if antiga else 0))
    if video:
        await db.executar("insert into garimpo_videos(garimpo_id,video_id) values (%s,%s)", (g["id"],video))
    return str(g["id"])


async def test_ficha_recupera_garimpo_mais_recente_que_contem_o_video(cliente):
    video = await preparar_video()
    espaco = (await cliente.get("/api/eu")).json()["espaco"]["id"]
    await busca(espaco,video,antiga=True)
    recente = await busca(espaco,video)
    await busca(espaco,None)  # a busca mais nova não contém o vídeo
    assert (await cliente.get(f"/api/videos/{video}")).json()["garimpo_id"] == recente


async def test_ficha_nao_revela_buscas_de_outro_espaco(cliente):
    video = await preparar_video()
    outro = await db.um("insert into espacos(nome) values ('Outro espaço') returning id")
    await busca(outro["id"],video)
    assert (await cliente.get(f"/api/videos/{video}")).json()["garimpo_id"] is None
    meu = (await cliente.get("/api/eu")).json()["espaco"]["id"]
    propria = await busca(meu,video,antiga=True)
    assert (await cliente.get(f"/api/videos/{video}")).json()["garimpo_id"] == propria
