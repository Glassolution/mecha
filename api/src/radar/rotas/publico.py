"""Dados compartilhados do Início. O caminho antigo é mantido, mas exige login."""

from fastapi import APIRouter, Depends

from radar import db, sessao
from radar.biblioteca import SELECT_VIDEO, cartao
from radar.nichos import NICHOS
from typing import Literal

r = APIRouter(prefix="/api/publico", dependencies=[Depends(sessao.atual)])

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


@r.get("/painel")
async def painel(dias: Literal["7", "30"] = "7"):
    """Rankings agregados: presença em buscas, sem expor termos ou contas."""
    videos = await db.todos(
        SELECT_VIDEO.replace("select v.*,", "select v.*, ranking.pesquisas,") + """ join (
            select gv.video_id, count(*) as pesquisas
            from garimpo_videos gv join garimpos g on g.id = gv.garimpo_id
            where g.criado_em >= now() - %s * interval '1 day'
              and g.espaco_id is not null
            group by gv.video_id
        ) ranking on ranking.video_id = v.id
        where v.sinal_software is not false
        order by ranking.pesquisas desc, v.views desc nulls last, v.id limit 6""",
        (int(dias),),
    )
    # Uma busca conta uma vez em cada nicho, mesmo com vários vídeos desse nicho.
    nichos = await db.todos(
        """select n.nicho, count(distinct g.id) as pesquisas
        from garimpos g join garimpo_videos gv on gv.garimpo_id = g.id
        join videos v on v.id = gv.video_id
        cross join lateral unnest(v.nichos) as n(nicho)
        where g.criado_em >= now() - %s * interval '1 day'
          and g.espaco_id is not null
          and v.sinal_software is not false
        group by n.nicho order by pesquisas desc, n.nicho limit 5""",
        (int(dias),),
    )
    return {
        "videos": [{**cartao(v), "pesquisas": v["pesquisas"]} for v in videos],
        "nichos": [{"id": n["nicho"], "nome": NICHOS.get(n["nicho"], (n["nicho"], ""))[0],
                    "pesquisas": n["pesquisas"]} for n in nichos],
    }
