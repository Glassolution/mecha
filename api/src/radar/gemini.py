"""Chamada ao Gemini pela API REST (generateContent). A chave fica só no servidor, no cabeçalho.

Uma função para a análise, a conversa e o analista de oportunidades: texto livre ou JSON com
esquema, com ou sem busca na web.
"""

import json
from dataclasses import dataclass

import httpx

from radar.config import config

API = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"


class SemChave(Exception):
    pass


@dataclass
class Resposta:
    texto: str
    tokens: int
    custo_usd: float
    buscas: int


def _custo(uso: dict, buscas: int) -> float:
    cfg = config()
    entrada = (uso.get("promptTokenCount") or 0) + (uso.get("toolUsePromptTokenCount") or 0)
    saida = (uso.get("candidatesTokenCount") or 0) + (uso.get("thoughtsTokenCount") or 0)
    return (entrada * cfg.gemini_usd_entrada_milhao + saida * cfg.gemini_usd_saida_milhao) / 1_000_000 \
        + buscas * cfg.gemini_usd_por_busca


async def gerar(modelo: str, sistema: str, conteudos: list[dict], *, esquema: dict | None = None,
                buscar_na_web: bool = False, max_tokens: int = 8000, timeout: float = 90,
                pensamento: str | None = None) -> Resposta:
    """`conteudos` no formato do Gemini: [{"role": "user" | "model", "parts": [{"text": ...}]}]."""
    cfg = config()
    if not cfg.gemini_api_key:
        raise SemChave()
    geracao: dict = {"maxOutputTokens": max_tokens}
    if pensamento:  # "low" corta pela metade o tempo e o custo de tarefas simples
        geracao["thinkingConfig"] = {"thinkingLevel": pensamento}
    if esquema:
        geracao |= {"responseMimeType": "application/json", "responseJsonSchema": esquema}
    corpo: dict = {
        "systemInstruction": {"parts": [{"text": sistema}]},
        "contents": conteudos,
        "generationConfig": geracao,
    }
    if buscar_na_web:
        corpo["tools"] = [{"google_search": {}}]
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=15)) as cli:
        r = await cli.post(API.format(modelo=modelo), json=corpo,
                           headers={"x-goog-api-key": cfg.gemini_api_key.get_secret_value()})
    if r.status_code != 200:
        raise RuntimeError(f"Gemini respondeu {r.status_code}: {r.text[:300]}")
    dados = r.json()
    candidato = (dados.get("candidates") or [{}])[0]
    partes = (candidato.get("content") or {}).get("parts") or []
    texto = "".join(p.get("text", "") for p in partes if not p.get("thought")).strip()
    fim = candidato.get("finishReason")
    if fim not in ("STOP", None) or not texto:
        raise RuntimeError(f"Gemini sem resposta completa ({fim or dados.get('promptFeedback')})")
    uso = dados.get("usageMetadata") or {}
    buscas = len((candidato.get("groundingMetadata") or {}).get("webSearchQueries") or [])
    return Resposta(texto=texto, tokens=uso.get("totalTokenCount") or 0, custo_usd=_custo(uso, buscas), buscas=buscas)


def esquema(modelo: type) -> dict:
    """Esquema JSON de um modelo pydantic com as referências ($defs) já embutidas."""
    bruto = modelo.model_json_schema()
    defs = bruto.pop("$defs", {})

    def embutir(no):
        if isinstance(no, dict):
            if "$ref" in no:
                return embutir(defs[no["$ref"].rsplit("/", 1)[1]])
            return {k: embutir(v) for k, v in no.items() if k != "title"}
        if isinstance(no, list):
            return [embutir(v) for v in no]
        return no

    return embutir(bruto)


def json_da_resposta(texto: str) -> dict:
    """Com busca na web o modelo às vezes embrulha o JSON em ```json ... ```."""
    texto = texto.strip()
    if texto.startswith("```"):
        texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(texto)
