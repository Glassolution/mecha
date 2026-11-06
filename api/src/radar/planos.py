"""Planos e limites (docs/radar-saas.md seção 11). Aplicados sempre no servidor."""

from datetime import date

from fastapi import HTTPException

from radar import db

PLANOS = {
    "gratis": {"nome": "Grátis", "garimpos": 3, "planos_ideia": 1, "itens_completos": 20, "preco_mensal_centavos": 0},
    "pro": {"nome": "Pro", "garimpos": 40, "planos_ideia": 20, "itens_completos": None, "preco_mensal_centavos": 4990},
    "agencia": {"nome": "Agência", "garimpos": 150, "planos_ideia": 100, "itens_completos": None, "preco_mensal_centavos": 7990},
}


def mes_atual() -> date:
    return date.today().replace(day=1)


async def uso(espaco_id) -> dict:
    mes = mes_atual()
    r = await db.um("select * from uso where espaco_id = %s and mes = %s", (espaco_id, mes))
    analises = await db.um(
        """select
          (select count(*) from analises_video where espaco_id = %s
           and criado_em >= %s and criado_em < %s::date + interval '1 month')
          + (select count(*) from oportunidades_garimpo where espaco_id = %s
           and status = 'pronto' and resultado is not null
           and atualizado_em >= %s and atualizado_em < %s::date + interval '1 month') as total""",
        (espaco_id, mes, mes, espaco_id, mes, mes),
    )
    return {**(r or {"garimpos": 0, "planos_ideia": 0, "creditos_video": 0, "downloads": 0}),
            "analises": analises["total"]}


async def devolver_garimpo(espaco_id, quando: date) -> None:
    """Devolve um garimpo ao mês em que ele foi contado (pesquisa que falhou sem trazer nada)."""
    await db.executar(
        "update uso set garimpos = greatest(garimpos - 1, 0) where espaco_id = %s and mes = %s",
        (espaco_id, quando.replace(day=1)),
    )


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
