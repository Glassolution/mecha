"""Trabalhadores da fila (arq). Rodam mesmo com o navegador da pessoa fechado.

Uso: uv run arq radar.trabalhador.Trabalhador
"""

import logging

from arq import cron
from arq.connections import RedisSettings

from radar import db, garimpo, oportunidades, vitrine
from radar.armazenamento import garantir_balde
from radar.coleta.apify_instagram import ApifyInstagram
from radar.coleta.apify_tiktok import ApifyTikTok
from radar.config import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def ao_iniciar(ctx):
    await db.abrir()
    try:
        await garantir_balde()
    except Exception:  # sem o balde as capas não aparecem, mas o garimpo funciona
        logging.exception("não deu para criar o balde das capas no Supabase Storage")
    cfg = config()
    # um provedor por fonte; sem a chave da Apify, nenhum (o garimpo mostra o erro em cada fonte)
    ctx["coletores"] = {}
    if cfg.apify_token:
        token = cfg.apify_token.get_secret_value()
        ctx["coletores"] = {
            "tiktok": ApifyTikTok(token, cfg.apify_actor, cfg.buscar_hashtag),
            "instagram": ApifyInstagram(token, cfg.apify_actor_instagram),
        }


async def ao_parar(ctx):
    await db.fechar()


async def rodar_garimpo(ctx, garimpo_id: str):
    await garimpo.rodar(garimpo_id, ctx["coletores"])


async def analisar_oportunidades(ctx, garimpo_id: str):
    await oportunidades.rodar(garimpo_id)


async def abastecer_vitrine(ctx):
    await vitrine.abastecer(ctx["coletores"])


class Trabalhador:
    functions = [rodar_garimpo, analisar_oportunidades]
    # de hora em hora; só busca quando a última vitrine tem 7 dias ou mais
    cron_jobs = [cron(abastecer_vitrine, minute=7, run_at_startup=True, unique=True)]
    on_startup = ao_iniciar
    on_shutdown = ao_parar
    redis_settings = RedisSettings.from_dsn(config().redis_url)
    max_jobs = 8
    job_timeout = 30 * 60
    keep_result = 3600
