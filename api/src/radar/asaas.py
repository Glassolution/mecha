"""Cliente da API do Asaas (https://docs.asaas.com). A chave fica só aqui, no servidor."""

import logging

import httpx

from radar.config import config

log = logging.getLogger(__name__)


class ErroAsaas(Exception):
    def __init__(self, status: int, mensagem: str):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


def configurado() -> bool:
    chave = config().asaas_api_key
    return chave is not None and bool(chave.get_secret_value().strip())


async def pedir(metodo: str, caminho: str, json: dict | None = None, params: dict | None = None) -> dict:
    """Um pedido à API do Asaas. Sem nova tentativa automática: um timeout não prova que nada foi criado."""
    if not configurado():
        raise ErroAsaas(503, "Os pagamentos ainda não estão configurados.")
    cfg = config()
    cabecalhos = {"access_token": cfg.asaas_api_key.get_secret_value().strip(), "User-Agent": "mecha",
                  "Accept": "application/json"}
    # a documentação pede pelo menos 60 s: o cartão pode demorar e um corte antes gera pedido duplicado
    async with httpx.AsyncClient(base_url=cfg.asaas_url, timeout=60) as cli:
        try:
            r = await cli.request(metodo, caminho, json=json, params=params, headers=cabecalhos)
        except httpx.HTTPError as e:
            log.warning("Asaas sem resposta em %s %s: %s", metodo, caminho, type(e).__name__)
            raise ErroAsaas(504, "O sistema de pagamentos não respondeu. Tente de novo em 1 minuto.") from e
    if r.status_code >= 400:
        try:
            erros = r.json().get("errors") or []
            mensagem = " ".join(e["description"] for e in erros if e.get("description"))
        except (ValueError, AttributeError, TypeError):
            mensagem = ""
        log.warning("Asaas recusou %s %s: %s %s", metodo, caminho, r.status_code, mensagem)
        raise ErroAsaas(r.status_code, mensagem or "O sistema de pagamentos recusou o pedido.")
    return r.json() if r.content else {}
