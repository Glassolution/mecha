"""Planos e limites (docs/radar-saas.md seção 11). Aplicados sempre no servidor."""

from datetime import date

from fastapi import HTTPException

from radar import db

PLANOS = {
    "gratis": {"nome": "Grátis", "garimpos": 3, "planos_ideia": 1, "itens_completos": 20},
    "pro": {"nome": "Pro", "garimpos": 40, "planos_ideia": 20, "itens_completos": None},
    "agencia": {"nome": "Agência", "garimpos": 150, "planos_ideia": 100, "itens_completos": None},
}


def mes_atual() -> date:
    return date.today().replace(day=1)


async def uso(espaco_id) -> dict:
    r = await db.um("select * from uso where espaco_id = %s and mes = %s", (espaco_id, mes_atual()))
    return r or {"garimpos": 0, "planos_ideia": 0, "creditos_video": 0, "downloads": 0}


async def gastar_garimpo(espaco: dict) -> None:
    """Confere e conta um garimpo do mês. Acabou: 402 com o texto do botão."""
    limite = PLANOS[espaco["plano"]]["garimpos"]
    r = await db.um(
        """insert into uso (espaco_id, mes, garimpos) values (%s, %s, 1)
           on conflict (espaco_id, mes) do update set garimpos = uso.garimpos + 1
           where uso.garimpos < %s
           returning garimpos""",
        (espaco["id"], mes_atual(), limite),
    )
    if not r:
        raise HTTPException(402, {
            "mensagem": f"Você usou os {limite} garimpos do mês no plano {PLANOS[espaco['plano']]['nome']}.",
            "botao": "Assinar o Pro",
        })


def itens_completos(espaco: dict) -> int | None:
    return PLANOS[espaco["plano"]]["itens_completos"]
