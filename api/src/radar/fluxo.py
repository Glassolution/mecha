"""Fluxo ao vivo do garimpo: eventos num Redis Stream, lidos pela rota SSE.

O stream dá id a cada evento, então a tela retoma do ponto certo (Last-Event-ID) depois de uma queda.
"""

import json

from redis.asyncio import Redis

from radar.config import config

_redis: Redis | None = None


def redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(config().redis_url, decode_responses=True)
    return _redis


def chave(garimpo_id: str) -> str:
    return f"garimpo:{garimpo_id}:eventos"


async def publicar(garimpo_id: str, tipo: str, dados: dict) -> None:
    k = chave(str(garimpo_id))
    await redis().xadd(k, {"tipo": tipo, "dados": json.dumps(dados, default=str)}, maxlen=5000, approximate=True)
    await redis().expire(k, 2 * 24 * 3600)


async def ler(garimpo_id: str, depois_de: str, bloquear_ms: int = 15000) -> list[tuple[str, str, dict]]:
    resposta = await redis().xread({chave(str(garimpo_id)): depois_de}, block=bloquear_ms, count=100)
    eventos = []
    for _, itens in resposta or []:
        for id_, campos in itens:
            eventos.append((id_, campos["tipo"], json.loads(campos["dados"])))
    return eventos


async def ultimo_id(garimpo_id: str) -> str:
    itens = await redis().xrevrange(chave(str(garimpo_id)), count=1)
    return itens[0][0] if itens else "0-0"
