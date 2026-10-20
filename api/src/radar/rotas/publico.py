"""Rotas abertas, sem login: o que o Início mostra para quem ainda não entrou.

Só dados da biblioteca compartilhada (vídeos públicos do TikTok), nada de conta ou espaço.
"""

from fastapi import APIRouter

from radar import db
from radar.biblioteca import SELECT_VIDEO, cartao

r = APIRouter(prefix="/api/publico")

_EM_ALTA = "v.views::float / greatest(extract(epoch from now() - v.publicado) / 86400, 1) desc nulls last"


@r.get("/resumo")
async def resumo():
    n = await db.um(
        """select count(*) as total,
                  count(*) filter (where visto_primeiro > now() - interval '7 days') as semana
           from videos where sinal_software is not false"""
    )
    return {"videos_total": n["total"], "videos_semana": n["semana"]}


@r.get("/em-alta")
async def em_alta(limite: int = 90):
    linhas = await db.todos(
        SELECT_VIDEO + f" where v.sinal_software is not false and v.capa_path is not null order by {_EM_ALTA} limit %s",
        (max(1, min(limite, 90)),),
    )
    return {"itens": [cartao(v) for v in linhas]}
