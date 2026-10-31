from radar import db, vitrine
from radar.biblioteca import gravar_video
from radar.nichos import PALAVRAS

from conftest import ColetorSimulado, video_simulado


async def test_escolhe_uma_palavra_por_area_comecando_pelas_mais_vazias(cliente):
    # saúde já tem vídeos bons; as outras áreas, nenhum
    async with db.conexao() as con:
        for n in range(3):
            await gravar_video(con, video_simulado(90 + n, idioma="pt"), "app para médicos")
    await db.executar("update videos set nichos = '{saude}', potencial_saas = 90 where id like 'tt:sim9%%'")
    termos = await vitrine.escolher_termos(len([n for n, l in PALAVRAS.items() if l]))
    areas = [next(n for n, l in PALAVRAS.items() if any(pt == t for pt, _ in l)) for t in termos]
    assert len(set(areas)) == len(areas) and areas[-1] == "saude"
    # palavra já buscada vai para o fim da fila da área
    primeira = PALAVRAS["dev"][0][0]
    await db.executar("insert into busca_cache (termo, fonte, idioma, buscado_em, video_ids) values (%s, 'tiktok', 'pt', now(), '{}')",
                      (primeira,))
    assert primeira not in await vitrine.escolher_termos(20)


async def test_roda_uma_vez_por_semana_sem_dono(cliente):
    coletor = ColetorSimulado()
    gid = await vitrine.abastecer({"tiktok": coletor, "instagram": ColetorSimulado()})
    g = await db.um("select espaco_id, status, idiomas, array_length(termos, 1) as n from garimpos where id = %s", (gid,))
    assert g == {"espaco_id": None, "status": "concluido", "idiomas": ["pt"], "n": 5}
    assert {idioma for _, idioma in coletor.chamadas} == {"pt"}
    # na mesma semana não roda de novo, e o garimpo não aparece na lista de ninguém
    assert await vitrine.abastecer({"tiktok": ColetorSimulado()}) is None
    assert (await cliente.get("/api/garimpos?limite=50")).json() == []
    # passados 7 dias, roda outra
    await db.executar("update garimpos set criado_em = now() - interval '8 days' where id = %s", (gid,))
    assert await vitrine.abastecer({"tiktok": ColetorSimulado()}) is not None


async def test_sem_apify_nao_faz_nada(cliente):
    assert await vitrine.abastecer({}) is None
    assert (await db.um("select count(*) as n from garimpos"))["n"] == 0
