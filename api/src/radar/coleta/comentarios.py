"""Comentários dos vídeos pela Apify, só quando alguém pede a análise de oportunidades.

A busca normal não traz comentários (sairia caro). Aqui buscamos poucos, dos vídeos com mais views,
e reaproveitamos o que foi buscado nos últimos 7 dias. Guardamos o texto e as curtidas, nunca o nome
de quem comentou.
"""

import logging
import re

from radar import db
from radar.coleta.apify import ApifyBase
from radar.coleta.base import DeveParar
from radar.config import config

log = logging.getLogger(__name__)

# preço dos actors no plano grátis da Apify; o teto de cada execução tem folga de 50%
CUSTO_POR_COMENTARIO = {"tiktok": 0.00125, "instagram": 0.0026}
ROTULO = {"tiktok": "TikTok", "instagram": "Instagram"}


async def _nunca() -> bool:
    return False


class ComentariosApify(ApifyBase):
    def __init__(self, token: str, fonte: str, actor: str, pausa_s: float = 3.0):
        super().__init__(token, actor, pausa_s)
        self.fonte = fonte
        self.rotulo = ROTULO[fonte]

    def _entrada(self, urls: list[str], por_video: int) -> dict:
        if self.fonte == "tiktok":
            return {"postURLs": urls, "commentsPerPost": por_video, "maxRepliesPerComment": 0}
        return {"directUrls": urls, "resultsLimit": por_video, "includeNestedComments": False}

    async def buscar(self, videos: list[dict], por_video: int, deve_parar: DeveParar = _nunca
                     ) -> tuple[dict[str, list[dict]], float]:
        """Devolve {video_id: [{texto, curtidas}]} e o custo em US$."""
        teto = max(0.05, len(videos) * por_video * CUSTO_POR_COMENTARIO[self.fonte] * 1.5)
        async with self._cliente() as cli:
            run, itens = await self._rodar(cli, self._entrada([v["url_original"] for v in videos], por_video),
                                           deve_parar, teto_usd=teto)
        # o id curto do vídeo (número do TikTok, código do Reel) aparece no endereço de cada comentário
        chaves = {v["id"].split(":", 1)[1]: v["id"] for v in videos}
        por_video_id: dict[str, list[dict]] = {v["id"]: [] for v in videos}
        for item in itens:
            endereco = " ".join(str(item.get(k) or "") for k in ("videoWebUrl", "submittedVideoUrl", "postUrl", "inputUrl"))
            vid = next((vid for chave, vid in chaves.items() if re.search(rf"{re.escape(chave)}(?![\w-])", endereco)), None)
            texto = " ".join(str(item.get("text") or "").split())[:400]
            if not vid or not texto or len(por_video_id[vid]) >= por_video:
                continue
            curtidas = item.get("diggCount", item.get("likesCount"))
            por_video_id[vid].append({"texto": texto, "curtidas": curtidas if isinstance(curtidas, int) else None})
        custo = float(run.get("usageTotalUsd") or 0) or len(itens) * CUSTO_POR_COMENTARIO[self.fonte]
        return por_video_id, custo


def coletores() -> dict[str, ComentariosApify]:
    cfg = config()
    if not cfg.apify_token:
        return {}
    token = cfg.apify_token.get_secret_value()
    return {"tiktok": ComentariosApify(token, "tiktok", cfg.actor_comentarios_tiktok),
            "instagram": ComentariosApify(token, "instagram", cfg.actor_comentarios_instagram)}


async def garantir(videos: list[dict], por_video: int, provedores: dict[str, ComentariosApify]) -> float:
    """Busca os comentários que faltam (ou têm mais de 7 dias) e grava. Devolve o custo em US$."""
    frescos = {r["id"] for r in await db.todos(
        "select id from videos where id = any(%s) and comentarios_em > now() - interval '7 days'",
        ([v["id"] for v in videos],))}
    custo = 0.0
    for fonte, provedor in provedores.items():
        faltam = [v for v in videos if v["fonte"] == fonte and v["id"] not in frescos]
        if not faltam:
            continue
        achados, gasto = await provedor.buscar(faltam, por_video)
        custo += gasto
        async with db.conexao() as con:
            async with con.transaction():
                for vid, lista in achados.items():
                    await con.execute("delete from comentarios_video where video_id = %s", (vid,))
                    for n, c in enumerate(lista):
                        await con.execute(
                            "insert into comentarios_video (video_id, posicao, texto, curtidas) values (%s, %s, %s, %s)",
                            (vid, n, c["texto"], c["curtidas"]),
                        )
                    await con.execute("update videos set comentarios_em = now() where id = %s", (vid,))
        log.info("comentários %s: %s vídeos, US$ %.4f", fonte, len(faltam), gasto)
    return custo
