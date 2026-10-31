"""Assinatura da pessoa (Asaas) e o endereço que recebe os avisos do Asaas."""

import hmac
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from radar import assinaturas, sessao
from radar.config import config
from radar.rotas.garimpos import fila

log = logging.getLogger(__name__)
r = APIRouter(prefix="/api")


class PedidoAssinatura(BaseModel):
    plano: Literal["pro", "agencia"]
    forma: Literal["pix", "cartao"]
    documento: str = Field(min_length=11, max_length=20)


@r.post("/assinatura")
async def assinar(p: PedidoAssinatura, e=Depends(sessao.atual)):
    """Devolve o link da fatura do Asaas. O plano só muda quando o Asaas avisar que o pagamento entrou."""
    return await assinaturas.assinar(e, p.plano, p.forma, p.documento)


@r.post("/assinatura/cancelar")
async def cancelar(e=Depends(sessao.atual)):
    return await assinaturas.cancelar(e)


@r.post("/assinatura/reembolsar")
async def reembolsar(e=Depends(sessao.atual)):
    a = await assinaturas.resumo(e["id"])
    if not a:
        raise HTTPException(404, "Você não tem uma assinatura.")
    return await assinaturas.reembolsar(a["id"], pela_pessoa=True, espaco_id=e["id"])


@r.post("/asaas/webhook", include_in_schema=False)
async def aviso_do_asaas(request: Request):
    """Grava o aviso e responde 200; quem aplica a regra é o trabalhador (o Asaas reenvia se demorar)."""
    esperado = config().asaas_webhook_token
    if esperado is None or not esperado.get_secret_value():
        raise HTTPException(503, "Webhook não configurado.")
    recebido = request.headers.get("asaas-access-token", "")
    if not hmac.compare_digest(recebido.encode(), esperado.get_secret_value().encode()):
        raise HTTPException(401, "Token inválido.")
    try:
        dados = await request.json()
    except ValueError:
        raise HTTPException(400, "Corpo inválido.")
    if not isinstance(dados, dict) or not isinstance(dados.get("id"), str) or not isinstance(dados.get("event"), str):
        raise HTTPException(400, "Aviso sem id ou event.")
    novo = await assinaturas.guardar_evento(dados)
    if novo:
        try:
            await (await fila()).enqueue_job("processar_evento_asaas", novo, _job_id=f"asaas:{novo}")
        except Exception:  # já está gravado: a rotina de 5 em 5 minutos pega
            log.warning("não deu para pôr o aviso %s na fila", novo)
    return {"recebido": True}
