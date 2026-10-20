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
    await garimpo.rodar(gid, {"tiktok": coletor})

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
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
    await db.executar("update garimpos set status = 'garimpando' where id = %s", (gid,))  # trabalhador reiniciado
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
    assert (await db.um("select count(*) as n from garimpo_videos where garimpo_id = %s", (gid,)))["n"] == 6


async def test_cache_de_7_dias_nao_chama_o_provedor(cliente):
    await garimpo.rodar(await _criar(cliente), {"tiktok": ColetorSimulado()})
    segundo = ColetorSimulado()
    gid = await _criar(cliente)
    await garimpo.rodar(gid, {"tiktok": segundo})
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
    await garimpo.rodar(gid, {"tiktok": coletor})
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "parado"
    assert len(coletor.chamadas) == 1  # conferiu o Parar antes da palavra seguinte
    assert g["vistos"] == 3


async def test_erro_da_fonte_aparece_com_o_motivo(cliente):
    gid = await _criar(cliente, fontes=["tiktok", "youtube"])
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado(erro=ErroFonte("O limite de buscas do TikTok deste mês acabou."))})
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
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
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
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado()})
    todos = await fluxo.ler(gid, "0-0", bloquear_ms=10)
    meio = todos[len(todos) // 2][0]
    depois = await fluxo.ler(gid, meio, bloquear_ms=10)
    assert [e[0] for e in depois] == [e[0] for e in todos[len(todos) // 2 + 1:]]
    assert json.dumps(depois[-1][2])  # dados serializáveis


async def test_explorar_em_alta_e_filtro_por_nicho(cliente):
    from datetime import datetime, timedelta, timezone

    agora = datetime.now(timezone.utc)
    async with db.conexao() as con:
        # vídeo novo com menos views ganha do antigo com mais views em "em alta"
        await gravar_video(con, video_simulado(1, views=900_000, publicado=agora - timedelta(days=300)), "ai tool")
        await gravar_video(con, video_simulado(2, views=200_000, publicado=agora - timedelta(days=2),
                                               texto="[SIMULADO] app para médico"), "app para médicos")
    em_alta = (await cliente.get("/api/videos?ordem=em_alta")).json()["itens"]
    assert [v["id"] for v in em_alta] == ["tt:sim2", "tt:sim1"]
    assert em_alta[0]["views_dia"] == 100_000
    saude = (await cliente.get("/api/videos?nichos=saude")).json()
    assert [v["id"] for v in saude["itens"]] == ["tt:sim2"]
    cat = (await cliente.get("/api/catalogo")).json()
    setores = next(c for c in cat["colunas"] if c["titulo"] == "Setores")
    assert next(i for i in setores["itens"] if i["id"] == "saude")["total"] == 1


async def test_sugestao_em_portugues_busca_tambem_o_equivalente_em_ingles(cliente):
    gid = await _criar(cliente, termos=["app para médicos"], idiomas=["pt", "en"])
    coletor = ColetorSimulado()
    await garimpo.rodar(gid, {"tiktok": coletor})
    assert coletor.chamadas == [("app para médicos", "pt"), ("ai for doctors", "en")]
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["termos"] == ["app para médicos"] and g["vistos"] == 6  # a tela só mostra o português

    so_pt = await _criar(cliente, termos=["app para advogados"], idiomas=["pt"])
    coletor_pt = ColetorSimulado()
    await garimpo.rodar(so_pt, {"tiktok": coletor_pt})
    assert coletor_pt.chamadas == [("app para advogados", "pt")]


async def test_ideias_de_palavras_so_em_portugues(cliente):
    ideias = (await cliente.get("/api/palavras?nicho=saude")).json()
    assert len(ideias) == 8 and all(i["idioma"] == "pt" for i in ideias)
    assert "ai for doctors" not in [i["termo"] for i in ideias]


async def test_tiktok_e_instagram_no_mesmo_garimpo(cliente):
    from datetime import datetime, timedelta, timezone

    from radar.coleta.base import ResultadoBusca

    class InstagramSimulado(ColetorSimulado):
        async def buscar(self, termo, idioma, limite, deve_parar):
            self.chamadas.append((termo, idioma))
            agora = datetime.now(timezone.utc)
            return ResultadoBusca([
                video_simulado(1, id=f"ig:novo{len(self.chamadas)}", fonte="instagram", idioma=idioma, publicado=agora),
                video_simulado(2, id=f"ig:velho{len(self.chamadas)}", fonte="instagram", publicado=agora - timedelta(days=500)),
                video_simulado(3, id=f"ig:es{len(self.chamadas)}", fonte="instagram", idioma="es", publicado=agora),
            ], custo_usd=0.03)

    gid = await _criar(cliente, fontes=["tiktok", "instagram"])
    instagram = InstagramSimulado()
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado(por_busca=2), "instagram": instagram})

    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "concluido"
    assert g["por_fonte"]["tiktok"]["status"] == "pronto" and g["por_fonte"]["instagram"]["status"] == "pronto"
    assert len(instagram.chamadas) == 2  # as duas palavras também no Instagram
    grade = (await cliente.get(f"/api/garimpos/{gid}/videos")).json()
    reels = [v for v in grade if v["fonte"] == "instagram"]
    assert len(reels) == 2 and all(v["id"].startswith("ig:novo") for v in reels)  # velho e espanhol ficaram de fora
    assert len([v for v in grade if v["fonte"] == "tiktok"]) == 4


async def test_erro_no_instagram_nao_derruba_o_tiktok(cliente):
    gid = await _criar(cliente, fontes=["tiktok", "instagram"])
    await garimpo.rodar(gid, {"tiktok": ColetorSimulado(), "instagram": ColetorSimulado(erro=ErroFonte("O Instagram não respondeu agora."))})
    g = (await cliente.get(f"/api/garimpos/{gid}")).json()
    assert g["status"] == "concluido"
    assert g["por_fonte"]["tiktok"]["status"] == "pronto"
    assert g["por_fonte"]["instagram"] == {**g["por_fonte"]["instagram"], "status": "erro", "detalhe": "O Instagram não respondeu agora."}
