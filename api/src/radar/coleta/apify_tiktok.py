"""Provedor principal do TikTok orgânico: Apify, actor clockworks/tiktok-scraper.

O token fica só no servidor. Cada busca é uma execução do actor: a palavra e a hashtag
equivalente, no país do idioma, com a legenda que o próprio TikTok gera (sem transcrição paga).
"""

import asyncio
import logging
from datetime import datetime

import httpx

from radar.coleta.apify import API, ApifyBase
from radar.coleta.base import DeveParar, ResultadoBusca, VideoBruto
from radar.coleta.legendas import vtt_para_texto
from radar.coleta.regras import PAIS_DO_IDIOMA, hashtag_do_termo

log = logging.getLogger(__name__)
# código de idioma do TikTok nas legendas -> nosso código
_IDIOMA_LEGENDA = {"por": "pt", "pt": "pt", "eng": "en", "en": "en", "spa": "es", "es": "es"}


class ApifyTikTok(ApifyBase):
    nome = "apify"
    rotulo = "TikTok"

    def __init__(self, token: str, actor: str, buscar_hashtag: bool = True, pausa_s: float = 3.0):
        super().__init__(token, actor, pausa_s)
        self._buscar_hashtag = buscar_hashtag

    async def buscar(self, termo: str, idioma: str, limite: int, deve_parar: DeveParar) -> ResultadoBusca:
        entrada = {
            "searchQueries": [termo],
            "searchSection": "/video",
            "resultsPerPage": limite,
            # sem isto o actor usa o padrão dele (#fyp)
            "hashtags": [hashtag_do_termo(termo)] if self._buscar_hashtag else [],
            "downloadSubtitlesOptions": "DOWNLOAD_SUBTITLES",  # só a legenda do TikTok; nada pago
            "proxyCountryCode": PAIS_DO_IDIOMA.get(idioma, "US"),
            "shouldDownloadVideos": False,
            "shouldDownloadCovers": False,
        }
        async with self._cliente() as cli:
            run, itens = await self._rodar(cli, entrada, deve_parar)
            videos = [v for v in (self._converter(i, idioma) for i in itens) if v]
            await self._legendas(cli, videos, itens, idioma)
            custo = float(run.get("usageTotalUsd") or 0)
            return ResultadoBusca(videos=videos, custo_usd=custo)

    @staticmethod
    def _converter(item: dict, idioma_busca: str) -> VideoBruto | None:
        if not item.get("id") or item.get("isSlideshow"):
            return None  # só vídeo; carrossel de fotos fica de fora
        meta = item.get("videoMeta") or {}
        autor = item.get("authorMeta") or {}
        largura, altura = meta.get("width"), meta.get("height")
        publicado = None
        if item.get("createTimeISO"):
            publicado = datetime.fromisoformat(item["createTimeISO"].replace("Z", "+00:00"))
        idioma = item.get("textLanguage")
        return VideoBruto(
            id=f"tt:{item['id']}",
            fonte="tiktok",
            tipo_item="anuncio" if item.get("isAd") or item.get("isSponsored") else "post",
            url_original=item.get("webVideoUrl") or f"https://www.tiktok.com/@{autor.get('name', '_')}/video/{item['id']}",
            idioma=idioma if idioma in ("pt", "en", "es") else None,
            autor=f"@{autor['name']}" if autor.get("name") else None,
            autor_nome=autor.get("nickName"),
            autor_seguidores=autor.get("fans"),
            texto=item.get("text"),
            hashtags=[h["name"] for h in item.get("hashtags") or [] if h.get("name")],
            capa_origem=meta.get("originalCoverUrl") or meta.get("coverUrl"),
            views=item.get("playCount"),
            likes=item.get("diggCount"),
            comentarios=item.get("commentCount"),
            compartilhamentos=item.get("shareCount"),
            salvamentos=item.get("collectCount"),
            duracao_s=meta.get("duration"),
            largura=largura,
            altura=altura,
            # o TikTok às vezes informa medidas quadradas; quadrado não é deitado
            vertical=(altura > largura) if largura and altura and largura != altura else None,
            publicado=publicado,
        )

    async def _legendas(self, cli: httpx.AsyncClient, videos: list[VideoBruto], itens: list[dict], idioma: str) -> None:
        por_id = {f"tt:{i.get('id')}": i for i in itens}
        limite = asyncio.Semaphore(4)

        async def uma(v: VideoBruto):
            links = ((por_id.get(v.id) or {}).get("videoMeta") or {}).get("subtitleLinks") or []
            escolhida = _escolher_legenda(links, v.idioma or idioma)
            if not escolhida:
                return
            async with limite:
                try:
                    r = await cli.get(escolhida["downloadLink"])
                    r.raise_for_status()
                except httpx.HTTPError:
                    log.warning("legenda indisponível para %s", v.id)
                    return
            texto, tempos = vtt_para_texto(r.text)
            if texto:
                v.transcricao, v.transcricao_tempos = texto, tempos
                v.legenda_fonte = escolhida.get("source")

        await asyncio.gather(*(uma(v) for v in videos))


def _escolher_legenda(links: list[dict], idioma: str) -> dict | None:
    """Prefere a legenda no idioma do vídeo e a fala original (ASR) à tradução automática (MT)."""
    # o pedido leva o token: só baixa de dentro da própria Apify
    validas = [l for l in links if (l.get("downloadLink") or "").startswith(API + "/")]
    if not validas:
        return None

    def peso(l: dict) -> tuple[int, int]:
        codigo = (l.get("language") or "").split("-")[0].lower()
        return (_IDIOMA_LEGENDA.get(codigo) == idioma, l.get("source") == "ASR")

    return max(validas, key=peso)
