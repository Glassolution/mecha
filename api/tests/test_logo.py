"""Logo do site do SaaS: só domínios públicos passam (nada de IP, localhost ou caminho de arquivo)."""

import pytest

from radar.armazenamento import dominio_do_site


@pytest.mark.parametrize(
    ("site", "esperado"),
    [
        ("https://www.velods.com.br/", "velods.com.br"),
        ("velods.com.br", "velods.com.br"),
        ("HTTP://Exemplo.COM/preco?x=1#topo", "exemplo.com"),
        ("app.exemplo.io:8080/painel", "app.exemplo.io"),
    ],
)
def test_dominio_valido(site, esperado):
    assert dominio_do_site(site) == esperado


@pytest.mark.parametrize("site", ["", "localhost", "http://127.0.0.1", "192.168.0.1", "../../etc/passwd", "exemplo", "a b.com", "file:///etc/passwd"])
def test_dominio_recusado(site):
    assert dominio_do_site(site) is None


def test_prefere_o_icone_de_celular_e_ignora_svg():
    from radar.armazenamento import candidatos_de_logo

    html = """<head>
      <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
      <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
      <link rel="mask-icon" href="/mask.png" />
    </head>"""
    lista = candidatos_de_logo(html, "https://www.velods.com.br/")
    assert lista[0] == "https://www.velods.com.br/apple-touch-icon.png?v=2"
    assert "https://www.velods.com.br/favicon-32.png?v=2" in lista
    assert not any(u.endswith((".svg", "mask.png")) for u in lista)


def test_tipo_pela_assinatura_e_recusa_svg():
    from radar.armazenamento import tipo_da_imagem

    assert tipo_da_imagem(b"\x89PNG\r\n\x1a\n...") == "image/png"
    assert tipo_da_imagem(b"\xff\xd8\xff\xe0...") == "image/jpeg"
    assert tipo_da_imagem(b"<svg onload='x()'></svg>") is None
    assert tipo_da_imagem(b"<html>") is None


async def test_nao_visita_endereco_interno():
    from radar.armazenamento import _host_publico

    assert not await _host_publico("localhost")
    assert not await _host_publico("127.0.0.1")
    assert not await _host_publico("10.0.0.5")
    assert not await _host_publico("169.254.169.254")
