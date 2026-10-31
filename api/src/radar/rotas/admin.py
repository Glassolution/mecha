"""Painel administrativo de consulta. Todas as consultas exigem autorização própria."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Response

from radar import admin, db

r = APIRouter(prefix="/api/admin", dependencies=[Depends(admin.exigir)])


@r.get("/painel")
async def painel(response: Response, dias: int = Query(7, ge=7, le=90)):
    response.headers["Cache-Control"] = "private, no-store"
    agora = datetime.now(timezone.utc)
    inicio = agora.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=dias - 1)
    anterior = inicio - timedelta(days=dias)
    totais = await db.um("""select
        (select count(*) from contas) as usuarios,
        (select count(*) from contas where criado_em >= %s) as usuarios_periodo,
        (select count(*) from contas where criado_em >= %s and criado_em < %s) as usuarios_anterior,
        (select count(*) from garimpos where criado_em >= %s) as garimpos,
        (select count(*) from garimpos where criado_em >= %s and criado_em < %s) as garimpos_anterior,
        (select count(*) from garimpos where criado_em >= %s and status = 'concluido') as concluidos,
        (select count(*) from garimpos where criado_em >= %s and status = 'erro') as erros,
        (select count(*) from garimpos where status in ('aguardando','garimpando')) as em_andamento,
        (select count(*) from videos) as videos,
        (select count(*) from colecoes) as colecoes""",
        (inicio, anterior, inicio, inicio, anterior, inicio, inicio, inicio))
    serie = await db.todos("""select d.dia::date as dia,
        coalesce(c.total,0) as usuarios, coalesce(g.total,0) as garimpos
        from generate_series(%s::date::timestamp, %s::date::timestamp, interval '1 day') d(dia)
        left join (select (criado_em at time zone 'UTC')::date dia, count(*) total from contas
                   where criado_em >= %s group by 1) c on c.dia = d.dia::date
        left join (select (criado_em at time zone 'UTC')::date dia, count(*) total from garimpos
                   where criado_em >= %s group by 1) g on g.dia = d.dia::date order by d.dia""",
        (inicio.date(), agora.date(), inicio, inicio))
    usuarios = await db.todos("""select c.id, c.nome, c.email, c.avatar, c.cor_perfil, c.cor_personagem, c.criado_em,
        (select e.plano from membros m join espacos e on e.id=m.espaco_id
         where m.conta_id=c.id order by e.criado_em limit 1) as plano
        from contas c order by c.criado_em desc, c.id limit 100""")
    garimpos = await db.todos("""select g.id, g.termos, g.status, g.vistos, g.criado_em, g.fim_em, e.nome as espaco
        from garimpos g join espacos e on e.id=g.espaco_id order by g.criado_em desc, g.id limit 100""")
    videos = await db.todos("""select id, autor, texto, fonte, views, visto_primeiro
        from videos order by visto_primeiro desc, id limit 50""")
    atividade = await db.todos("""select * from (
        select 'cadastro' as tipo, c.nome as titulo, 'Criou uma conta na Wae' as descricao,
               c.avatar, c.cor_perfil, c.cor_personagem, c.criado_em as data
        from contas c
        union all
        select 'garimpo', coalesce(c.nome,e.nome),
               array_to_string(g.termos, ', ') || ' · ' || g.status,
               c.avatar, c.cor_perfil, c.cor_personagem, coalesce(g.fim_em,g.criado_em)
        from garimpos g join espacos e on e.id=g.espaco_id left join contas c on c.id=e.dono_id
        ) a order by data desc limit 15""")
    # Planos atribuídos à conta não comprovam pagamentos. Sem provedor de cobrança,
    # os indicadores financeiros ficam indisponíveis, nunca estimados nem zerados.
    faturamento = {"status": "nao_configurado", "moeda": "BRL", "recebido_centavos": None,
                   "mrr_centavos": None, "assinaturas_ativas": None}
    return {"atualizado_em": agora, "dias": dias, "totais": totais, "serie": serie, "faturamento": faturamento,
            "usuarios": usuarios, "garimpos": garimpos, "videos": videos, "atividade": atividade}
