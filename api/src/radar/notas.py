"""Nota, tendência e filtro (docs/radar-saas.md seção 7).

O veredito é calculado na hora. Sem avaliação, o critério fica null ("falta avaliar") e o item nunca passa.
"""

import math

CRITERIOS_PADRAO = {
    "modo": "ideia", "atencao": "media", "tendencia": "subindo", "nichos": [],
    "autores_min": 2, "sem_br": False, "modelo": "qualquer",
    # modo criativo
    "prova": "media", "gancho": "forte", "formatos": [],
}
PRESET_MODO = {"ideia": {"atencao": "media", "tendencia": "subindo"}, "criativo": {"prova": "media", "gancho": "forte"}}

PROVA_VIEWS = {"leve": 50_000, "media": 200_000, "forte": 1_000_000}
ATENCAO_VIEWS = {"leve": 200_000, "media": 1_000_000, "forte": 5_000_000}
TENDENCIA_MIN = {"subindo": 0.0, "media": 0.20, "explodindo": 0.50}


def _limitar(x: float) -> int:
    return round(max(0.0, min(100.0, x)))


def prova_organico(views: int | None, compartilhamentos: int | None = None, salvamentos: int | None = None) -> int | None:
    if not views:
        return None
    p = 20 * math.log10(views) - 50
    if ((compartilhamentos or 0) + (salvamentos or 0)) / views >= 0.01:
        p += 10
    return _limitar(p)


def criativo(notas: dict | None) -> int | None:
    if not notas:
        return None
    return _limitar(0.4 * notas["hook_forte"] + 0.3 * notas["demo_clara"]
                    + 0.15 * notas["prova_social"] + 0.15 * notas["pessoa_natural"])


def nota_video(prova: int | None, crit: int | None) -> int | None:
    if prova is None or crit is None:
        return None
    return _limitar((prova + crit) / 2)


def nota_ideia(views_total: int, crescimento: float | None, autores: int) -> int:
    atencao = _limitar(20 * math.log10(max(views_total, 1)) - 60)
    vel = 0 if crescimento is None else _limitar(100 * min(1.0, max(crescimento, 0) / 0.5))
    div = _limitar(25 * math.log2(1 + autores))
    return _limitar(0.4 * atencao + 0.35 * vel + 0.25 * div)


def fmt_num(n: int | None) -> str:
    if n is None:
        return "—"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f} mi".replace(".", ",").replace(",0 mi", " mi")
    if n >= 1_000:
        return f"{n / 1_000:.0f} mil"
    return str(n)


def _item(k: str, ok: bool | None, txt: str) -> dict:
    return {"k": k, "ok": ok, "txt": txt}


def avalia_video(v: dict, criterios: dict | None = None) -> dict:
    """Modo Achar criativo: critérios do Faro + demo_clara. Sem avaliação, os critérios de IA ficam null."""
    c = {**CRITERIOS_PADRAO, **(criterios or {})}
    av = v.get("avaliacao")
    notas = (av or {}).get("notas") or {}
    replica = (av or {}).get("replica") or {}
    itens = []
    minimo = PROVA_VIEWS.get(c["prova"], 0)
    views = v.get("views")
    itens.append(_item("prova", None if views is None else views >= minimo,
                       f"Atenção: {fmt_num(views)} views" + (f" (pede {fmt_num(minimo)})" if views is not None and views < minimo else "")))

    def ia(k: str, valor: int | None, corte: int, rotulo: str):
        if valor is None:
            itens.append(_item(k, None, f"{rotulo}: falta avaliar"))
        else:
            itens.append(_item(k, valor >= corte, f"{rotulo}: nota {valor}"))

    if c.get("gancho") == "forte":
        ia("gancho", notas.get("hook_forte"), 70, "Gancho")
    ia("demo", notas.get("demo_clara"), 60, "Demonstração")
    if c.get("formatos"):
        fmt = (av or {}).get("formato")
        itens.append(_item("formato", None if fmt is None else fmt in c["formatos"], f"Formato: {fmt or 'falta avaliar'}"))
    vert = v.get("vertical")
    itens.append(_item("vertical", vert, "Tela vertical" if vert else ("Tela deitada" if vert is False else "Tela: medindo")))
    dur = v.get("duracao_s")
    if dur is None:
        itens.append(_item("duracao", None, "Duração: medindo"))
    else:
        txt = f"Duração: {dur} s" + (" (o vídeo com IA usa os primeiros 30 s)" if dur > 30 else "")
        itens.append(_item("duracao", 4 <= dur <= 60, txt))
    ia("produto_trocavel", replica.get("produto_trocavel"), 60, "Trocar o software")
    ia("pessoa_trocavel", replica.get("pessoa_trocavel"), 60, "Trocar a pessoa")
    ia("livre_de_marca", replica.get("livre_de_marca"), 60, "Livre de marca")
    return {"passa": all(i["ok"] is True for i in itens), "itens": itens}


def avalia_ideia(ideia: dict, criterios: dict | None = None) -> dict:
    c = {**CRITERIOS_PADRAO, **(criterios or {})}
    itens = []
    views = ideia.get("views_total") or 0
    minimo = ATENCAO_VIEWS.get(c["atencao"], 0)
    itens.append(_item("atencao", views >= minimo, f"Atenção: {fmt_num(views)} views"))
    cres = ideia.get("crescimento")
    if cres is None or (ideia.get("videos") or 0) < 3 or not ideia.get("historia_7d"):
        itens.append(_item("tendencia", None, "Tendência: medindo"))
    else:
        alvo = TENDENCIA_MIN.get(c["tendencia"], 0.0)
        ok = cres > alvo if c["tendencia"] == "subindo" else cres >= alvo
        sinal = "+" if cres >= 0 else ""
        itens.append(_item("tendencia", ok, f"Tendência: {sinal}{round(cres * 100)}% em 7 dias"))
    autores = ideia.get("autores") or 0
    itens.append(_item("autores", autores >= c["autores_min"], f"Criadores: {autores} diferentes"))
    if c.get("nichos"):
        itens.append(_item("nicho", ideia.get("nicho") in c["nichos"], f"Nicho: {ideia.get('nicho_rotulo', ideia.get('nicho'))}"))
    if c.get("sem_br"):
        br = ideia.get("tem_versao_br")
        itens.append(_item("sem_br", None if br is None else br is False,
                           "Sem versão no Brasil" if br is False else ("Já tem versão no Brasil" if br else "Brasil: não verificado")))
    if c.get("modelo") and c["modelo"] != "qualquer":
        itens.append(_item("modelo", ideia.get("modelo") == c["modelo"], f"Modelo: {ideia.get('modelo') or 'desconhecido'}"))
    return {"passa": all(i["ok"] is True for i in itens), "itens": itens}
