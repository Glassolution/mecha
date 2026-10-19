"""Aplica as migrações SQL pendentes, em ordem. Rodar de novo não repete nada.

Uso: uv run python -m radar.migrar [url-do-banco]
"""

import asyncio
import sys
from pathlib import Path

import psycopg

from radar.config import config

PASTA = Path(__file__).parent / "migracoes"


async def migrar(url: str) -> list[str]:
    aplicadas: list[str] = []
    async with await psycopg.AsyncConnection.connect(url, autocommit=True) as con:
        await con.execute(
            "create table if not exists schema_migracoes (nome text primary key, aplicada_em timestamptz default now())"
        )
        cur = await con.execute("select nome from schema_migracoes")
        feitas = {r[0] for r in await cur.fetchall()}
        for arquivo in sorted(PASTA.glob("*.sql")):
            if arquivo.name in feitas:
                continue
            async with con.transaction():
                await con.execute(arquivo.read_text())
                await con.execute("insert into schema_migracoes (nome) values (%s)", (arquivo.name,))
            aplicadas.append(arquivo.name)
    return aplicadas


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else config().database_url
    feitas = asyncio.run(migrar(url))
    print("aplicadas:", ", ".join(feitas) if feitas else "nenhuma (já estava em dia)")
