"""Conexão com o PostgreSQL (pool assíncrono do psycopg 3)."""

from contextlib import asynccontextmanager

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from radar.config import config

_pool: AsyncConnectionPool | None = None


async def abrir(url: str | None = None) -> AsyncConnectionPool:
    global _pool
    if _pool is None:
        _pool = AsyncConnectionPool(
            url or config().database_url,
            min_size=1,
            max_size=config().db_conexoes,
            kwargs={"row_factory": dict_row},
            open=False,
        )
        await _pool.open()
    return _pool


async def fechar() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def conexao():
    pool = await abrir()
    async with pool.connection() as con:
        yield con


async def um(sql: str, params=None) -> dict | None:
    async with conexao() as con:
        cur = await con.execute(sql, params)
        return await cur.fetchone()


async def todos(sql: str, params=None) -> list[dict]:
    async with conexao() as con:
        cur = await con.execute(sql, params)
        return await cur.fetchall()


async def executar(sql: str, params=None) -> None:
    async with conexao() as con:
        await con.execute(sql, params)
