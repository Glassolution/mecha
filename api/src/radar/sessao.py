"""Sessão por cookie httpOnly. O navegador nunca vê chave nenhuma; só um id aleatório de sessão."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response

from radar import db
from radar.config import config

COOKIE = "radar_sessao"
DURACAO = timedelta(days=30)


async def criar(resposta: Response, conta_id) -> None:
    sid = secrets.token_urlsafe(32)
    await db.executar(
        "insert into sessoes (id, conta_id, expira_em) values (%s, %s, %s)",
        (sid, conta_id, datetime.now(timezone.utc) + DURACAO),
    )
    resposta.set_cookie(
        COOKIE, sid, max_age=int(DURACAO.total_seconds()), httponly=True,
        secure=config().cookie_seguro, samesite="lax", path="/",
    )


async def encerrar(request: Request, resposta: Response) -> None:
    sid = request.cookies.get(COOKIE)
    if sid:
        await db.executar("delete from sessoes where id = %s", (sid,))
    resposta.delete_cookie(COOKIE, path="/")


async def atual(request: Request) -> dict:
    """Conta e espaço de quem pede. 401 sem sessão válida."""
    sid = request.cookies.get(COOKIE)
    if not sid:
        raise HTTPException(401, "Entre para continuar.")
    r = await db.um(
        """select c.id as conta_id, c.email, c.nome as conta_nome, e.*
           from sessoes s
           join contas c on c.id = s.conta_id
           join membros m on m.conta_id = c.id
           join espacos e on e.id = m.espaco_id
           where s.id = %s and s.expira_em > now()
           order by e.criado_em limit 1""",
        (sid,),
    )
    if not r:
        raise HTTPException(401, "Sua sessão acabou. Entre de novo.")
    return r
