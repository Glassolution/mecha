"""Converte a legenda WebVTT do TikTok em texto corrido, guardando onde cada frase começa."""

import re

LIMITE = 4000  # docs/radar-saas.md, regra 2 da seção 14

_TEMPO = re.compile(r"(\d+):(\d{2}):(\d{2})[.,](\d{3})\s*-->")
_TEMPO_CURTO = re.compile(r"(\d{2}):(\d{2})[.,](\d{3})\s*-->")


def _segundos(linha: str) -> int | None:
    m = _TEMPO.search(linha)
    if m:
        h, mi, s, _ = map(int, m.groups())
        return h * 3600 + mi * 60 + s
    m = _TEMPO_CURTO.search(linha)
    if m:
        mi, s, _ = map(int, m.groups())
        return mi * 60 + s
    return None


def vtt_para_texto(vtt: str) -> tuple[str, list[list[int]]]:
    """Devolve (texto, tempos), com tempos = [[segundo, posição no texto], ...]. Corta em 4.000 caracteres."""
    partes: list[str] = []
    tempos: list[list[int]] = []
    tamanho = 0
    segundo_atual: int | None = None
    for linha in vtt.splitlines():
        linha = linha.strip()
        if not linha or linha == "WEBVTT" or linha.isdigit() or linha.startswith(("NOTE", "STYLE", "Kind:", "Language:")):
            continue
        s = _segundos(linha)
        if s is not None:
            segundo_atual = s
            continue
        frase = re.sub(r"<[^>]+>", "", linha).strip()
        if not frase:
            continue
        if tamanho + len(frase) + 1 > LIMITE:
            break
        if segundo_atual is not None:
            tempos.append([segundo_atual, tamanho])
            segundo_atual = None
        partes.append(frase)
        tamanho += len(frase) + 1
    return " ".join(partes), tempos
