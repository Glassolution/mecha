from radar import db
from radar.biblioteca import gravar_video
from radar.planos import mes_atual
from conftest import video_simulado


async def test_uso_inclui_analises_concluidas_do_mes_sem_confundir_com_pesquisas(cliente):
    espaco = (await db.um("select id from espacos limit 1"))["id"]
    mes = mes_atual()
    async with db.conexao() as con:
        for n in (1, 2):
            await gravar_video(con, video_simulado(n), "teste")
    await db.executar("insert into analises_video (espaco_id, video_id, resultado, modelo, criado_em) values (%s, 'tt:sim1', '{}', 'teste', %s), (%s, 'tt:sim2', '{}', 'teste', %s::date - interval '1 day')", (espaco, mes, espaco, mes))
    for status in ('pronto', 'erro', 'analisando'):
        g = await db.um("insert into garimpos (espaco_id) values (%s) returning id", (espaco,))
        await db.executar("insert into oportunidades_garimpo (garimpo_id, espaco_id, status, resultado) values (%s, %s, %s, '{}')", (g['id'], espaco, status))
    resposta = await cliente.get('/api/eu')
    assert resposta.status_code == 200
    assert resposta.json()['uso']['analises'] == 2
    assert resposta.json()['uso']['garimpos'] == 0
    # Ler uma análise já feita não gera um novo consumo.
    assert (await cliente.get('/api/videos/tt:sim1/analise')).status_code == 200
    assert (await cliente.get('/api/eu')).json()['uso']['analises'] == 2


async def test_uso_sem_analises(cliente):
    assert (await cliente.get('/api/eu')).json()['uso']['analises'] == 0
