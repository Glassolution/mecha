from radar.coleta.apify_tiktok import ApifyTikTok, _escolher_legenda
from radar.coleta.legendas import vtt_para_texto
from radar.coleta.regras import (
    adivinhar_idioma, escrita_nao_latina, hashtag_do_termo, idiomas_do_termo, tem_sinal_software,
)
from radar.notas import avalia_ideia, avalia_video, nota_ideia, prova_organico


def test_idioma_por_pistas():
    assert adivinhar_idioma("app para médicos") == "pt"
    assert adivinhar_idioma("ai for doctors") == "en"
    assert adivinhar_idioma("saas idea") == "en"
    assert adivinhar_idioma("notion") is None


def test_cada_palavra_so_no_idioma_dela():
    assert idiomas_do_termo("ai for doctors", {}, ["pt", "en"]) == ["en"]
    assert idiomas_do_termo("notion", {}, ["pt", "en"]) == ["pt", "en"]  # sem certeza: idiomas do garimpo
    assert idiomas_do_termo("notion", {"notion": "en"}, ["pt", "en"]) == ["en"]


def test_escrita_nao_latina_fica_de_fora():
    assert escrita_nao_latina("这个AI工具太好用了")
    assert escrita_nao_latina("أفضل تطبيق ذكاء اصطناعي")
    assert not escrita_nao_latina("Esse app é incrível 😱 #ia")


def test_sinal_de_software():
    assert tem_sinal_software("link na bio 👆")
    assert tem_sinal_software(None, "go to tryfreed.ai now")
    assert tem_sinal_software("Essa IA faz tudo")
    assert not tem_sinal_software("receita de bolo de cenoura", "misture a farinha")


def test_hashtag_equivalente():
    assert hashtag_do_termo("App para médicos") == "appparamedicos"


def test_legenda_vtt():
    vtt = "WEBVTT\n\n00:00:00.140 --> 00:00:01.220\nIf you're in medicine\n\n00:00:05.000 --> 00:00:06.000\nuse <b>this</b> app\n"
    texto, tempos = vtt_para_texto(vtt)
    assert texto == "If you're in medicine use this app"
    assert tempos == [[0, 0], [5, 22]]


def test_legenda_corta_em_4000():
    vtt = "WEBVTT\n\n" + "".join(f"00:00:{i % 60:02d}.000 --> 00:00:{i % 60:02d}.500\n{'palavra ' * 20}\n\n" for i in range(200))
    texto, _ = vtt_para_texto(vtt)
    assert len(texto) <= 4000


def test_prefere_fala_original_no_idioma():
    links = [
        {"language": "eng-US", "source": "MT", "downloadLink": "https://api.apify.com/v2/a"},
        {"language": "por-PT", "source": "ASR", "downloadLink": "https://api.apify.com/v2/b"},
        {"language": "por-PT", "source": "ASR", "downloadLink": "https://outro-site.com/c"},
    ]
    assert _escolher_legenda(links, "pt")["downloadLink"].endswith("/b")


def test_converte_item_da_apify():
    item = {
        "id": "123", "text": "This AI does my notes", "textLanguage": "en", "createTimeISO": "2026-08-25T00:07:48.000Z",
        "authorMeta": {"name": "dr", "nickName": "Dr", "fans": 10}, "webVideoUrl": "https://www.tiktok.com/@dr/video/123",
        "videoMeta": {"width": 720, "height": 1280, "duration": 58, "coverUrl": "https://x/c.jpg"},
        "playCount": 1000, "diggCount": 10, "shareCount": 1, "collectCount": 2, "commentCount": 3,
        "hashtags": [{"name": "ai"}],
    }
    v = ApifyTikTok._converter(item, "en")
    assert v.id == "tt:123" and v.vertical and v.autor == "@dr" and v.salvamentos == 2
    assert ApifyTikTok._converter({**item, "isSlideshow": True}, "en") is None


def test_prova_e_nota():
    assert prova_organico(None) is None
    assert prova_organico(1_000_000) == 70
    assert prova_organico(1_000_000, 10_000, 0) == 80  # +10 com 1% de compartilhamentos + salvamentos
    assert 0 <= nota_ideia(3_400_000, 0.64, 5) <= 100


def test_sem_avaliacao_nunca_passa():
    v = {"views": 5_000_000, "vertical": True, "duracao_s": 20, "avaliacao": None}
    r = avalia_video(v, {"prova": "media"})
    assert r["passa"] is False
    assert next(i for i in r["itens"] if i["k"] == "prova")["ok"] is True
    assert next(i for i in r["itens"] if i["k"] == "gancho")["ok"] is None


def test_ideia_sem_historico_mostra_medindo():
    ideia = {"views_total": 2_000_000, "crescimento": None, "videos": 2, "autores": 2}
    tendencia = next(i for i in avalia_ideia(ideia)["itens"] if i["k"] == "tendencia")
    assert tendencia["ok"] is None and "medindo" in tendencia["txt"]


def test_nicho_por_palavras():
    from radar.coleta.nicho_texto import nichos_do_texto

    assert nichos_do_texto("Esse app ajuda o médico a escrever o prontuário") == ["saude"]
    assert "dev" in nichos_do_texto("I built an app with no-code in a weekend")
    assert nichos_do_texto("receita de bolo") == ["vida_pessoal"]
    assert nichos_do_texto("bom dia", None) == []
    assert len(nichos_do_texto("médico advogado corretor de imóveis loja virtual")) == 2


def test_idioma_da_legenda():
    from radar.coleta.regras import idioma_do_texto

    assert idioma_do_texto("Quer saber como eu uso as melhores IAs para advogados no meu escritório?") == "pt"
    assert idioma_do_texto("¡Todo el control de tu salud en tu celular! Si sos afiliado, la app oficial") == "es"
    assert idioma_do_texto("You can build something like CalAI too. It was built with AI tools") == "en"
    assert idioma_do_texto("Building MicroSaaS #saas") is None  # curto demais para saber
    assert idioma_do_texto(None) is None


def test_converte_reel_do_instagram():
    from radar.coleta.apify_instagram import ApifyInstagram

    item = {
        "shortCode": "DOq0Ui7jxaz", "type": "Video", "url": "https://www.instagram.com/p/DOq0Ui7jxaz/",
        "caption": "Quer saber como eu uso as melhores IAs para advogados no meu escritório?",
        "ownerUsername": "dra.ana", "ownerFullName": "Dra. Ana", "timestamp": "2026-09-03T12:00:00.000Z",
        "videoPlayCount": 88770, "likesCount": -1, "commentsCount": 1482, "sharesCount": 40,
        "videoDuration": 41.6, "dimensionsWidth": 720, "dimensionsHeight": 1280, "hashtags": ["ia"],
        "displayUrl": "https://scontent.cdninstagram.com/capa.jpg",
    }
    v = ApifyInstagram._converter(item)
    assert v.id == "ig:DOq0Ui7jxaz" and v.fonte == "instagram" and v.idioma == "pt"
    assert v.views == 88770 and v.likes is None  # curtidas escondidas pelo criador
    assert v.autor == "@dra.ana" and v.duracao_s == 42 and v.vertical
    assert ApifyInstagram._converter({**item, "type": "Image"}) is None
