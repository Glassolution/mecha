"""Acesso administrativo temporário: somente o e-mail da sessão assinada."""

from fastapi import Depends, HTTPException

from radar import sessao

EMAIL_ADMIN = "xavierluisfelipe12@gmail.com"


def permitido(email: str | None) -> bool:
    return isinstance(email, str) and email.strip().lower() == EMAIL_ADMIN


async def exigir(e=Depends(sessao.atual)):
    # Nunca usar nome, user_metadata, parâmetros ou e-mail editável no banco para conceder acesso.
    if not permitido(e.get("_email_autenticado")):
        raise HTTPException(403, "Você não tem acesso ao painel administrativo.")
    return e
