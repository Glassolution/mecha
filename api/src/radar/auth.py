"""Confere o login do Supabase Auth.

O site manda o token da sessão no cabeçalho Authorization. A assinatura é conferida com as chaves
públicas do projeto (JWKS, ES256), então a API não precisa de nenhuma senha do Supabase.
"""

import asyncio
from functools import lru_cache

import jwt

from radar.config import config


class TokenInvalido(Exception):
    pass


@lru_cache
def _cliente_jwks() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{config().supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)


def _chave_para(token: str):
    """A chave pública que assinou este token. Os testes trocam esta função por uma chave própria."""
    return _cliente_jwks().get_signing_key_from_jwt(token).key


async def verificar(token: str) -> dict:
    """Devolve os dados do usuário do token (sub, email…) ou lança TokenInvalido."""
    if not config().supabase_url:
        raise TokenInvalido("Supabase não configurado.")
    try:
        chave = await asyncio.to_thread(_chave_para, token)
        return jwt.decode(
            token,
            chave,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=f"{config().supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except (jwt.PyJWTError, jwt.PyJWKClientError) as e:
        raise TokenInvalido(str(e)) from e
