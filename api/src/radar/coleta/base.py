"""Interface comum dos provedores de TikTok (docs/radar-saas.md seção 14, regra 1).

Dois provedores trocáveis ficam atrás de ColetorTikTok, para que um bloqueio não derrube o produto.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Awaitable, Callable, Protocol


class ErroFonte(Exception):
    """Erro de uma fonte, com o motivo em português para mostrar na tela."""

    def __init__(self, motivo: str):
        super().__init__(motivo)
        self.motivo = motivo


class Parado(Exception):
    """O garimpo foi parado no meio da busca."""


@dataclass
class VideoBruto:
    id: str
    fonte: str
    tipo_item: str
    url_original: str
    idioma: str | None = None
    autor: str | None = None
    autor_nome: str | None = None
    autor_seguidores: int | None = None
    texto: str | None = None
    hashtags: list[str] = field(default_factory=list)
    transcricao: str | None = None
    transcricao_tempos: list[list[int]] | None = None
    legenda_fonte: str | None = None
    capa_origem: str | None = None
    video_url: str | None = None
    views: int | None = None
    likes: int | None = None
    comentarios: int | None = None
    compartilhamentos: int | None = None
    salvamentos: int | None = None
    duracao_s: int | None = None
    largura: int | None = None
    altura: int | None = None
    vertical: bool | None = None
    publicado: datetime | None = None


@dataclass
class ResultadoBusca:
    videos: list[VideoBruto]
    custo_usd: float = 0.0


DeveParar = Callable[[], Awaitable[bool]]


class ColetorTikTok(Protocol):
    nome: str

    async def buscar(self, termo: str, idioma: str, limite: int, deve_parar: DeveParar) -> ResultadoBusca:
        """Busca vídeos de uma palavra (e da hashtag equivalente) no país do idioma."""
        ...
