"""Reels do Instagram pela Apify (actor apify/instagram-hashtag-scraper, busca por palavra-chave).

Testado em 20/10/2026 (docs/decisoes.md item 35): palavra-chave traz Reels bem mais certeiros que
hashtag. O Instagram não traz a fala transcrita nem deixa pedir só vídeos recentes; a legenda escrita
costuma ser longa e o filtro de data fica no garimpo.
"""

from datetime import datetime

from radar.coleta.apify import ApifyBase
from radar.coleta.base import DeveParar, ResultadoBusca, VideoBruto
from radar.coleta.regras import idioma_do_texto

# preço do actor no plano grátis da Apify (US$ 2,60 por 1.000 Reels); o teto de cada busca tem folga de 50%
CUSTO_POR_REEL = 0.0026


class ApifyInstagram(ApifyBase):
    nome = "apify_instagram"
    rotulo = "Instagram"

    async def buscar(self, termo: str, idioma: str, limite: int, deve_parar: DeveParar) -> ResultadoBusca:
        entrada = {"hashtags": [termo], "keywordSearch": True, "resultsType": "reels", "resultsLimit": limite}
        async with self._cliente() as cli:
            run, itens = await self._rodar(cli, entrada, deve_parar, teto_usd=max(0.05, limite * CUSTO_POR_REEL * 1.5))
        videos = [v for v in (self._converter(i) for i in itens) if v]
        # a Apify fecha a conta da execução alguns segundos depois; até lá, estima pelo preço por Reel
        custo = float(run.get("usageTotalUsd") or 0) or len(itens) * CUSTO_POR_REEL
        return ResultadoBusca(videos=videos, custo_usd=custo)

    @staticmethod
    def _converter(item: dict) -> VideoBruto | None:
        codigo = item.get("shortCode")
        if not codigo or item.get("type") != "Video":
            return None  # só Reels; foto e carrossel ficam de fora
        largura, altura = item.get("dimensionsWidth"), item.get("dimensionsHeight")
        publicado = None
        if item.get("timestamp"):
            publicado = datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00"))
        likes = item.get("likesCount")
        duracao = item.get("videoDuration")
        return VideoBruto(
            id=f"ig:{codigo}",
            fonte="instagram",
            tipo_item="post",
            url_original=item.get("url") or f"https://www.instagram.com/reel/{codigo}/",
            idioma=idioma_do_texto(item.get("caption")),
            autor=f"@{item['ownerUsername']}" if item.get("ownerUsername") else None,
            autor_nome=item.get("ownerFullName") or None,
            texto=item.get("caption"),
            hashtags=[h for h in item.get("hashtags") or [] if isinstance(h, str)],
            capa_origem=item.get("displayUrl"),
            views=item.get("videoPlayCount") or item.get("igPlayCount") or item.get("videoViewCount"),
            likes=likes if isinstance(likes, int) and likes >= 0 else None,  # -1 quando o criador esconde
            comentarios=item.get("commentsCount"),
            compartilhamentos=item.get("sharesCount"),
            duracao_s=round(duracao) if isinstance(duracao, (int, float)) else None,
            largura=largura,
            altura=altura,
            vertical=(altura > largura) if largura and altura and largura != altura else None,
            publicado=publicado,
        )
