"""Quem está pedindo: login do Supabase (token no cabeçalho Authorization, posto pelo proxy do site).

O cookie de sessão próprio só vale com AMBIENTE=teste (testes automáticos).
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response

from radar import auth, db
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


_SELECT_ESPACO = """
    select c.id as conta_id, c.email, c.nome as conta_nome, e.*
    from contas c
    join membros m on m.conta_id = c.id
    join espacos e on e.id = m.espaco_id
    where c.id = %s
    order by e.criado_em limit 1
"""


async def _conta_do_supabase(claims: dict) -> dict:
    """Acha a conta do usuário do Supabase; no primeiro login, cria a conta e o espaço."""
    auth_id = claims["sub"]
    email = (claims.get("email") or "").lower()
    conta = await db.um("select id from contas where auth_id = %s", (auth_id,))
    if not conta:
        donos = {e.strip().lower() for e in config().donos.split(",") if e.strip()}
        async with db.conexao() as con:
            # trava por usuário: dois pedidos simultâneos no primeiro login não criam dois espaços
            await con.execute("select pg_advisory_xact_lock(hashtext(%s))", (auth_id,))
            cur = await con.execute("select id from contas where auth_id = %s", (auth_id,))
            conta = await cur.fetchone()
            if not conta and email in donos:
                # o dono herda o espaço que usava no computador (coleções, buscas) e fica no Pro
                cur = await con.execute(
                    """update contas set auth_id = %s, email = %s
                       where id = (select id from contas where email = 'voce@radar.local' and auth_id is null limit 1)
                       returning id""",
                    (auth_id, email),
                )
                conta = await cur.fetchone()
                if conta:
                    await con.execute(
                        "update espacos set plano = 'pro' where id in (select espaco_id from membros where conta_id = %s)",
                        (conta["id"],),
                    )
            if not conta:
                nome = (claims.get("user_metadata") or {}).get("full_name") or email.split("@")[0]
                cur = await con.execute(
                    """insert into contas (auth_id, email, nome) values (%s, %s, %s)
                       on conflict (email) do update set auth_id = excluded.auth_id
                       returning id""",
                    (auth_id, email or f"{auth_id}@sem-email", nome),
                )
                conta = await cur.fetchone()
                tem = await con.execute("select 1 from membros where conta_id = %s", (conta["id"],))
                if not await tem.fetchone():
                    cur = await con.execute(
                        "insert into espacos (dono_id, nome, plano) values (%s, %s, %s) returning id",
                        (conta["id"], "Meu espaço", "pro" if email in donos else "gratis"),
                    )
                    espaco = await cur.fetchone()
                    await con.execute("insert into membros (espaco_id, conta_id, papel) values (%s, %s, 'dono')",
                                      (espaco["id"], conta["id"]))
    r = await db.um(_SELECT_ESPACO, (conta["id"],))
    if not r:
        raise HTTPException(401, "Sua conta não tem um espaço. Fale com o suporte.")
    return r


async def atual(request: Request) -> dict:
    """Conta e espaço de quem pede. 401 sem login válido."""
    cabecalho = request.headers.get("authorization", "")
    if cabecalho.lower().startswith("bearer "):
        try:
            claims = await auth.verificar(cabecalho[7:].strip())
        except auth.TokenInvalido:
            raise HTTPException(401, "Sua sessão acabou. Entre de novo.")
        return await _conta_do_supabase(claims)

    sid = request.cookies.get(COOKIE)
    if not sid or config().ambiente != "teste":
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
