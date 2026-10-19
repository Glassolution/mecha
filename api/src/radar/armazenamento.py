"""Cópia das capas. Por enquanto em disco (data/capas); antes de publicar, troca por Cloudflare R2.

Só a capa é copiada. O vídeo de terceiros nunca é guardado.
"""

import re

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
