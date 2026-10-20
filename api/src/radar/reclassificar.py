"""Recalcula o nicho provável e o sinal de software de todos os vídeos. Rodar de novo não muda nada.

Uso: uv run python -m radar.reclassificar
"""

import asyncio

from radar import db
from radar.coleta.nicho_texto import nichos_do_texto
from radar.coleta.regras import tem_sinal_software


async def reclassificar() -> int:
    linhas = await db.todos("select id, texto, transcricao, hashtags from videos")
    async with db.conexao() as con:
        for v in linhas:
            tags = " ".join(v["hashtags"] or [])
            await con.execute(
                "update videos set nichos = %s, sinal_software = %s where id = %s",
                (nichos_do_texto(v["texto"], v["transcricao"], tags),
                 tem_sinal_software(v["texto"], v["transcricao"], tags), v["id"]),
            )
    return len(linhas)


async def _main():
    await db.abrir()
    print("vídeos reclassificados:", await reclassificar())
    await db.fechar()


if __name__ == "__main__":
    asyncio.run(_main())
