import json

from radar import db, fluxo, garimpo
from radar.biblioteca import gravar_video
from radar.coleta.base import ErroFonte

from conftest import ColetorSimulado, video_simulado


async def _criar(cliente, **dados) -> str:
    corpo = {"termos": ["ai for doctors", "app para médicos"], "idiomas": ["pt", "en"], **dados}
    r = await cliente.post("/api/garimpos", json=corpo)
    assert r.status_code == 200, r.text
    return str(r.json()["id"])


async def _eventos(gid: str) -> list[tuple[str, dict]]:
    return [(t, d) for _, t, d in await fluxo.ler(gid, "0-0", bloquear_ms=10)]


async def test_garimpo_do_zero_ao_fim(cliente):
    gid = await _criar(cliente)
    coletor = ColetorSimulado(por_busca=3)
    await garimpo.rodar(gid, coletor)

    assert coletor.chamadas == [("ai for doctors", "en"), ("app para médicos", "pt")]  # cada palavra no idioma dela
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "concluido"
    assert g["vistos"] == 6 and g["transcritos"] == 6
    assert g["por_fonte"]["tiktok"]["status"] == "pronto"
    tipos = [t for t, _ in await _eventos(gid)]
    assert "chegou" in tipos and tipos[-1] == "fim"
    grade = (await cliente.get(f"/api/garimpos/{gid}/videos")).json()
    assert len(grade) == 6 and grade[0]["views"] >= grade[-1]["views"]


async def test_rodar_duas_vezes_nao_duplica(cliente):
    gid = await _criar(cliente)
    await garimpo.rodar(gid, ColetorSimulado())
    await db.executar("update garimpos set status = 'garimpando' where id = %s", (gid,))  # trabalhador reiniciado
    await garimpo.rodar(gid, ColetorSimulado())
    assert (await db.um("select count(*) as n from garimpo_videos where garimpo_id = %s", (gid,)))["n"] == 6


async def test_cache_de_7_dias_nao_chama_o_provedor(cliente):
    await garimpo.rodar(await _criar(cliente), ColetorSimulado())
    segundo = ColetorSimulado()
    gid = await _criar(cliente)
    await garimpo.rodar(gid, segundo)
    assert segundo.chamadas == []
    assert (await cliente.get(f"/api/garimpos/{gid}")).json()["vistos"] == 6


async def test_parar_deixa_parado_e_o_que_chegou_fica(cliente):
    gid = await _criar(cliente, termos=["ai for doctors", "saas idea", "ai tool"])

    class ParaNoSegundo(ColetorSimulado):
        async def buscar(self, termo, idioma, limite, deve_parar):
            r = await super().buscar(termo, idioma, limite, deve_parar)
            if len(self.chamadas) == 1:
                await garimpo.parar(gid)
            return r

    coletor = ParaNoSegundo()
    await garimpo.rodar(gid, coletor)
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "parado"
    assert len(coletor.chamadas) == 1  # conferiu o Parar antes da palavra seguinte
    assert g["vistos"] == 3


async def test_erro_da_fonte_aparece_com_o_motivo(cliente):
    gid = await _criar(cliente, fontes=["tiktok", "youtube"])
    await garimpo.rodar(gid, ColetorSimulado(erro=ErroFonte("O limite de buscas do TikTok deste mês acabou.")))
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "erro"
    assert g["por_fonte"]["tiktok"]["status"] == "erro"
    assert g["por_fonte"]["tiktok"]["detalhe"] == "O limite de buscas do TikTok deste mês acabou."
    assert g["por_fonte"]["youtube"]["status"] == "trancada"


async def test_envio_parcial_nunca_apaga_campo():
    async with db.conexao() as con:
        assert await gravar_video(con, video_simulado(1), "ai tool") is True
        assert await gravar_video(con, video_simulado(1, transcricao=None, autor=None, views=999_999), "saas idea") is False
    v = await db.um("select * from videos where id = 'tt:sim1'")
    assert v["transcricao"].startswith("[SIMULADO]") and v["autor"] == "@criador1"
    assert v["views"] == 999_999
    assert sorted(v["termos"]) == ["ai tool", "saas idea"]


async def test_plano_gratis_bloqueia_o_quarto_garimpo(cliente):
    await db.executar("update espacos set plano = 'gratis'")
    for _ in range(3):
        await _criar(cliente)
    r = await cliente.post("/api/garimpos", json={"termos": ["ai tool"]})
    assert r.status_code == 402
    assert r.json()["botao"] == "Assinar o Pro"


async def test_garimpo_de_outro_espaco_nao_aparece(cliente):
    gid = await _criar(cliente)
    await db.executar("update garimpos set espaco_id = null where id = %s", (gid,))
    assert (await cliente.get(f"/api/garimpos/{gid}")).status_code == 404


async def test_sem_sessao_nao_entra(cliente):
    cliente.cookies.clear()
    assert (await cliente.get("/api/eu")).status_code == 401


async def test_planilha_abre_no_excel(cliente):
    gid = await _criar(cliente)
    await garimpo.rodar(gid, ColetorSimulado())
    col = (await cliente.post("/api/colecoes", json={"nome": "Médicos"})).json()
    vid = (await cliente.get(f"/api/garimpos/{gid}/videos")).json()[0]["id"]
    assert (await cliente.post("/api/salvos", json={"colecao_id": str(col["id"]), "item_tipo": "video", "item_id": vid})).status_code == 200
    r = await cliente.get(f"/api/colecoes/{col['id']}/planilha.csv")
    assert r.content.startswith("﻿".encode())
    linhas = r.content.decode("utf-8-sig").splitlines()
    assert linhas[0].startswith("Gancho;Tradução;Formato")
    assert len(linhas) == 2 and "TikTok" in linhas[1]


async def test_eventos_tem_id_para_retomar(cliente):
    gid = await _criar(cliente)
    await garimpo.rodar(gid, ColetorSimulado())
    todos = await fluxo.ler(gid, "0-0", bloquear_ms=10)
    meio = todos[len(todos) // 2][0]
    depois = await fluxo.ler(gid, meio, bloquear_ms=10)
    assert [e[0] for e in depois] == [e[0] for e in todos[len(todos) // 2 + 1:]]
    assert json.dumps(depois[-1][2])  # dados serializáveis
