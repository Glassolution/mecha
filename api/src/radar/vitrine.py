"""Vitrine da página Ideias: uma busca automática por semana nas áreas com menos vídeos bons.

O garimpo da vitrine não é de nenhum espaço (espaco_id nulo), então não aparece na lista de ninguém nem
gasta o limite de alguém; os vídeos que passam na triagem entram na biblioteca e, daí, na página Ideias.
O trabalhador confere de hora em hora: se a última vitrine tem 7 dias ou mais, roda outra. Assim, com o
computador desligado na hora marcada, ela roda assim que o ./rodar.sh voltar.
"""

import json
import logging

from radar import db, garimpo
from radar.coleta.base import Coletor
from radar.config import config
from radar.nichos import PALAVRAS

log = logging.getLogger(__name__)

FONTES = ["tiktok", "instagram"]


async def escolher_termos(quantos: int) -> list[str]:
    """Uma palavra por área, começando pelas áreas com menos vídeos que passaram na triagem.
    Em cada área, a palavra buscada há mais tempo (ou nunca buscada)."""
    fortes = {r["n"]: r["c"] for r in await db.todos(
        """select n, count(*) as c from (select unnest(nichos) as n from videos
           where idioma = 'pt' and potencial_saas >= %s) x group by n""", (config().nota_minima_saas,))}
    buscadas = {r["termo"]: r["quando"] for r in await db.todos(
        "select termo, max(buscado_em) as quando from busca_cache where idioma = 'pt' group by termo")}
    areas = sorted((n for n, lista in PALAVRAS.items() if lista), key=lambda n: (fortes.get(n, 0), n))
    termos = []
    for area in areas:
        livres = [pt for pt, _ in PALAVRAS[area] if pt not in termos]
        if livres:
            # nunca buscada vem primeiro; depois, a mais antiga (a ordem da lista desempata)
            termos.append(min(livres, key=lambda t: (t in buscadas, buscadas.get(t) or 0)))
        if len(termos) == quantos:
            break
    return termos


async def abastecer(coletores: dict[str, Coletor]) -> str | None:
    """Roda a vitrine se a última tem 7 dias ou mais. Devolve o id do garimpo criado, ou None."""
    cfg = config()
    if not cfg.vitrine_ligada or not coletores:
        return None
    recente = await db.um(
        """select id from garimpos where espaco_id is null and criterios ? 'vitrine'
           and criado_em > now() - interval '7 days' limit 1""")
    if recente:
        return None
    termos = await escolher_termos(cfg.vitrine_termos_por_semana)
    if not termos:
        return None
    g = await db.um(
        """insert into garimpos (espaco_id, modo, termos, termos_idioma, fontes, idiomas, criterios, por_fonte)
           values (null, 'ideia', %s, %s, %s, '{pt}', %s, %s) returning id""",
        (termos, json.dumps({t: "pt" for t in termos}), FONTES, json.dumps({"vitrine": True}),
         json.dumps({f: {"status": "na_fila"} for f in FONTES})),
    )
    log.info("vitrine: buscando %s", ", ".join(termos))
    await garimpo.rodar(str(g["id"]), coletores)
    fim = await db.um("select vistos, fracos, custo_usd from garimpos where id = %s", (g["id"],))
    log.info("vitrine: %s vídeos novos com potencial, %s fracos, US$ %.2f", fim["vistos"], fim["fracos"], fim["custo_usd"])
    return str(g["id"])
