"""Provedor principal do TikTok orgânico: Apify, actor clockworks/tiktok-scraper.

O token fica só no servidor. Cada busca é uma execução do actor: a palavra e a hashtag
equivalente, no país do idioma, com a legenda que o próprio TikTok gera (sem transcrição paga).
"""

import asyncio
import logging
from datetime import datetime

import httpx

from radar.coleta.base import DeveParar, ErroFonte, Parado, ResultadoBusca, VideoBruto
from radar.coleta.legendas import vtt_para_texto
from radar.coleta.regras import PAIS_DO_IDIOMA, hashtag_do_termo

log = logging.getLogger(__name__)

API = "https://api.apify.com/v2"
# código de idioma do TikTok nas legendas -> nosso código
_IDIOMA_LEGENDA = {"por": "pt", "pt": "pt", "eng": "en", "en": "en", "spa": "es", "es": "es"}


class ApifyTikTok:
    nome = "apify"

    def __init__(self, token: str, actor: str, buscar_hashtag: bool = True, pausa_s: float = 3.0):
        self._token = token
        self._actor = actor
        self._buscar_hashtag = buscar_hashtag
        self._pausa = pausa_s

    def _cliente(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=API,
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=httpx.Timeout(60, connect=15),
        )

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
            run = await self._pedir(cli, "POST", f"/acts/{self._actor}/runs", json=entrada)
            run_id = run["id"]
            try:
                run = await self._esperar(cli, run_id, deve_parar)
            except Parado:
                await self._pedir(cli, "POST", f"/actor-runs/{run_id}/abort")
                raise
            itens = await self._pedir(
                cli, "GET", f"/datasets/{run['defaultDatasetId']}/items", params={"clean": "true", "format": "json"}
            )
            videos = [v for v in (self._converter(i, idioma) for i in itens) if v]
            await self._legendas(cli, videos, itens, idioma)
            custo = float(run.get("usageTotalUsd") or 0)
            return ResultadoBusca(videos=videos, custo_usd=custo)

    async def _esperar(self, cli: httpx.AsyncClient, run_id: str, deve_parar: DeveParar) -> dict:
        while True:
            if await deve_parar():
                raise Parado()
            run = await self._pedir(cli, "GET", f"/actor-runs/{run_id}")
            status = run.get("status")
            if status == "SUCCEEDED":
                return run
            if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                raise ErroFonte("O TikTok não respondeu agora. Tente de novo em 1 minuto.")
            await asyncio.sleep(self._pausa)

    async def _pedir(self, cli: httpx.AsyncClient, metodo: str, caminho: str, **kw):
        for tentativa in range(5):
            try:
                r = await cli.request(metodo, caminho, **kw)
            except httpx.HTTPError:
                if tentativa == 4:
                    raise ErroFonte("Sem conexão com o provedor do TikTok. Tente de novo em 1 minuto.")
                await asyncio.sleep(2**tentativa)
                continue
            if r.status_code == 401:
                raise ErroFonte("A conexão com o provedor do TikTok não foi aceita. Avise o suporte.")
            if r.status_code in (402, 403):
                raise ErroFonte("O limite de buscas do TikTok deste mês acabou.")
            if r.status_code == 429 or r.status_code >= 500:
                await asyncio.sleep(2**tentativa)
                continue
            r.raise_for_status()
            corpo = r.json()
            return corpo["data"] if isinstance(corpo, dict) and "data" in corpo else corpo
        raise ErroFonte("O TikTok não respondeu agora. Tente de novo em 1 minuto.")

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
            vertical=(altura > largura) if largura and altura else None,
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
