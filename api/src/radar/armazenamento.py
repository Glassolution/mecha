"""Cópia das capas e das logos de sites. Por enquanto em disco (data/); antes de publicar, troca por Cloudflare R2.

Só a capa é copiada. O vídeo de terceiros nunca é guardado.
"""

import asyncio
import ipaddress
import re
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import httpx

from radar.config import config

_TAMANHO_MAX = 3 * 1024 * 1024
_NOME_SEGURO = re.compile(r"^[a-z0-9_]+\.jpg$")


def nome_capa(video_id: str) -> str:
    return re.sub(r"[^a-z0-9]", "_", video_id.lower()) + ".jpg"


def caminho_capa(nome: str):
    if not _NOME_SEGURO.match(nome):
        return None
    caminho = config().pasta_capas / nome
    return caminho if caminho.is_file() else None


def url_capa(capa_path: str | None) -> str | None:
    return f"/api/capas/{capa_path}" if capa_path else None


async def copiar_capa(cli: httpx.AsyncClient, video_id: str, origem: str) -> str | None:
    """Baixa a capa e devolve o nome guardado, ou None se a capa já expirou ou não é imagem."""
    if not origem.startswith("https://"):
        return None
    nome = nome_capa(video_id)
    destino = config().pasta_capas / nome
    if destino.is_file():
        return nome
    try:
        r = await cli.get(origem, follow_redirects=True)
        r.raise_for_status()
    except httpx.HTTPError:
        return None
    if not r.headers.get("content-type", "").startswith("image/") or len(r.content) > _TAMANHO_MAX:
        return None
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(r.content)
    return nome


# ---------- logo do site do SaaS da pessoa ----------
# Primeiro a logo que o próprio site declara (é sempre a atual); se não houver, o ícone guardado pelo Google.
# O servidor visita um endereço digitado pela pessoa, então cada salto (inclusive redirecionamentos) só vai
# para endereços públicos da internet: nada de rede interna, localhost ou IP privado.

_DOMINIO = re.compile(r"^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
_LOGO_MAX = 512 * 1024
_HTML_MAX = 1024 * 1024
_LOGO_VALIDADE = 7 * 86_400  # depois disso busca de novo (a logo pode ter mudado)
_SEM_LOGO: dict[str, float] = {}  # domínio -> quando soubemos que não tem logo (evita perguntar de novo por 1 dia)
_AGENTE = {"User-Agent": "Mozilla/5.0 (compatible; mecha/1.0; +https://mecha.app)"}


def dominio_do_site(site: str) -> str | None:
    """'https://www.Exemplo.com.br/x?y' -> 'exemplo.com.br'. None se não parecer um domínio público."""
    d = site.strip().lower()
    d = re.sub(r"^[a-z][a-z0-9+.-]*://", "", d)
    d = re.split(r"[/?#:@]", d, maxsplit=1)[0].removeprefix("www.")
    return d if _DOMINIO.match(d) else None


def tipo_da_imagem(dados: bytes) -> str | None:
    """O tipo pela assinatura dos bytes (não confia no que o servidor diz). SVG fica de fora: poderia carregar script."""
    if dados.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if dados.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if dados[:4] == b"RIFF" and dados[8:12] == b"WEBP":
        return "image/webp"
    if dados.startswith(b"\x00\x00\x01\x00"):
        return "image/x-icon"
    return None


_EXTENSAO = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/x-icon": "ico"}


class _Links(HTMLParser):
    """Junta os <link rel=icon ...> do começo da página."""

    def __init__(self):
        super().__init__()
        self.links: list[dict[str, str]] = []

    def handle_starttag(self, tag, attrs):
        if tag == "link":
            self.links.append({k.lower(): (v or "") for k, v in attrs})


def candidatos_de_logo(html: str, base: str) -> list[str]:
    """Endereços de logo declarados na página, do melhor para o pior (ícone de celular grande primeiro)."""
    leitor = _Links()
    leitor.feed(html)
    notas: list[tuple[int, str]] = []
    for link in leitor.links:
        rel, href = link.get("rel", "").lower(), link.get("href", "").strip()
        if not href or "mask-icon" in rel or "icon" not in rel:
            continue
        if href.lower().split("?")[0].endswith(".svg") or "svg" in link.get("type", ""):
            continue
        tamanhos = [int(n) for n in re.findall(r"(\d+)x\d+", link.get("sizes", ""))]
        tamanho = max(tamanhos) if tamanhos else (180 if "apple-touch-icon" in rel else 16)
        notas.append((tamanho + (1000 if "apple-touch-icon" in rel else 0), urljoin(base, href)))
    notas.append((900, urljoin(base, "/apple-touch-icon.png")))
    vistos: list[str] = []
    for _, url in sorted(notas, reverse=True):
        if url.startswith(("https://", "http://")) and url not in vistos:
            vistos.append(url)
    return vistos


async def _host_publico(host: str) -> bool:
    try:
        enderecos = await asyncio.get_running_loop().getaddrinfo(host, 443)
    except OSError:
        return False
    return bool(enderecos) and all(ipaddress.ip_address(e[4][0]).is_global for e in enderecos)


async def _baixar(cli: httpx.AsyncClient, url: str, limite: int) -> tuple[str, bytes] | None:
    """GET seguindo até 3 redirecionamentos, cada um conferido; devolve (url final, corpo) ou None."""
    for _ in range(4):
        partes = urlsplit(url)
        if partes.scheme not in ("http", "https") or not partes.hostname or not await _host_publico(partes.hostname):
            return None
        try:
            async with cli.stream("GET", url, headers=_AGENTE) as r:
                if r.is_redirect and "location" in r.headers:
                    url = urljoin(url, r.headers["location"])
                    continue
                if r.status_code != 200:
                    return None
                corpo = bytearray()
                async for parte in r.aiter_bytes():
                    corpo += parte
                    if len(corpo) > limite:
                        return None
                return url, bytes(corpo)
        except httpx.HTTPError:
            return None
    return None


async def _logo_do_proprio_site(cli: httpx.AsyncClient, dominio: str) -> bytes | None:
    for inicio in (f"https://{dominio}/", f"https://www.{dominio}/"):
        pagina = await _baixar(cli, inicio, _HTML_MAX)
        if not pagina:
            continue
        final, html = pagina
        for url in candidatos_de_logo(html.decode("utf-8", "ignore"), final)[:5]:
            imagem = await _baixar(cli, url, _LOGO_MAX)
            if imagem and tipo_da_imagem(imagem[1]):
                return imagem[1]
        return None
    return None


async def _logo_do_google(cli: httpx.AsyncClient, dominio: str) -> bytes | None:
    try:
        r = await cli.get("https://www.google.com/s2/favicons", params={"domain": dominio, "sz": 128}, follow_redirects=True)
    except httpx.HTTPError:
        return None
    # o Google responde 404 (com um globo genérico) quando não conhece a logo do site
    if r.status_code != 200 or len(r.content) > _LOGO_MAX or not tipo_da_imagem(r.content):
        return None
    return r.content


def _pasta_logos():
    return config().pasta_dados / "logos"


async def logo_do_site(dominio: str) -> tuple[bytes, str] | None:
    """Os bytes e o tipo da logo do site, guardados em disco por 7 dias. None se o site não tem logo."""
    for ext in _EXTENSAO.values():
        arquivo = _pasta_logos() / f"{dominio}.{ext}"
        if arquivo.is_file() and time.time() - arquivo.stat().st_mtime < _LOGO_VALIDADE:
            dados = arquivo.read_bytes()
            return dados, tipo_da_imagem(dados) or "image/png"
    if time.time() - _SEM_LOGO.get(dominio, 0) < 86_400:
        return None
    async with httpx.AsyncClient(timeout=6) as cli:
        dados = await _logo_do_proprio_site(cli, dominio) or await _logo_do_google(cli, dominio)
    if not dados:
        _SEM_LOGO[dominio] = time.time()
        return None
    tipo = tipo_da_imagem(dados)
    pasta = _pasta_logos()
    pasta.mkdir(parents=True, exist_ok=True)
    for velho in pasta.glob(f"{dominio}.*"):
        velho.unlink()
    (pasta / f"{dominio}.{_EXTENSAO[tipo]}").write_bytes(dados)
    return dados, tipo
