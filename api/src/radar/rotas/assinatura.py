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


class Cartao(BaseModel):
    """Só de passagem para o Asaas: nada disso é gravado."""
    titular: str = Field(max_length=100)
    numero: str = Field(max_length=30)
    validade: str = Field(max_length=10)
    cvv: str = Field(max_length=6)
    cep: str = Field(max_length=12)
    numero_endereco: str = Field(max_length=20)
    telefone: str = Field(max_length=20)


class PedidoAssinatura(BaseModel):
    plano: Literal["pro", "agencia"]
    forma: Literal["pix", "cartao"]
    documento: str = Field(min_length=11, max_length=20)
    cartao: Cartao | None = None


def ip_de_quem_paga(request: Request) -> str | None:
    """O Asaas pede o IP do aparelho da pessoa, não o do servidor.

    O site (Vercel) troca o X-Forwarded-For pelo IP real de quem acessou; o Render acrescenta o da Vercel no fim.
    Por isso vale o primeiro da lista.
    """
    encaminhado = request.headers.get("x-forwarded-for", "")
    primeiro = encaminhado.split(",")[0].strip()
    return primeiro or (request.client.host if request.client else None)


@r.post("/assinatura")
async def assinar(p: PedidoAssinatura, request: Request, e=Depends(sessao.atual)):
    """Pix: devolve o QR Code. Cartão: cobra na hora. O plano só muda quando o Asaas avisar que o pagamento entrou."""
    return await assinaturas.assinar(e, p.plano, p.forma, p.documento,
                                     p.cartao.model_dump() if p.cartao else None, ip_de_quem_paga(request))


@r.get("/assinatura/pix")
async def pix(e=Depends(sessao.atual)):
    """O QR Code do Pix que ainda está aguardando pagamento."""
    return await assinaturas.pix_pendente(e["id"])


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
