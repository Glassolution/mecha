"""Regras de coleta (docs/faro-original.md seção 5 e docs/radar-saas.md seção 5)."""

import re
import unicodedata

PAIS_DO_IDIOMA = {"pt": "BR", "en": "US", "es": "MX"}

# Regra 2: pistas para adivinhar o idioma de uma palavra digitada à mão.
_PISTAS = {
    "pt": re.compile(
        r"[ãõç]|\b(achadinhos?|para|com|que|você|voce|ferramentas?|aplicativo|site que|médicos?|medicos?|"
        r"advogados?|clínica|clinica|prontuário|prontuario|salão|salao|agenda|vendas|ganhar|dinheiro|ia)\b",
        re.I,
    ),
    "en": re.compile(
        r"\b(made me|finds|for|the|with|that|i built|tool|tools|idea|ideas|doctors?|lawyers?|"
        r"clinic|software|app that|pays|nobody|website)\b",
        re.I,
    ),
    "es": re.compile(r"[ñ¿¡]|\b(cocina|herramientas?|aplicación|médicos para|abogados|gratis para)\b", re.I),
}


def adivinhar_idioma(termo: str) -> str | None:
    """Devolve 'pt', 'en' ou 'es' quando há pista clara; None quando não há certeza."""
    pontos = {idioma: len(rx.findall(termo)) for idioma, rx in _PISTAS.items()}
    melhor = max(pontos, key=pontos.get)
    if pontos[melhor] == 0:
        return None
    empatados = [i for i, p in pontos.items() if p == pontos[melhor]]
    return melhor if len(empatados) == 1 else None


def idiomas_do_termo(termo: str, termos_idioma: dict[str, str], idiomas_garimpo: list[str]) -> list[str]:
    """Cada palavra só no idioma dela. Sem certeza, nos idiomas do garimpo."""
    if termo in termos_idioma:
        return [termos_idioma[termo]]
    palpite = adivinhar_idioma(termo)
    if palpite and (palpite in idiomas_garimpo or not idiomas_garimpo):
        return [palpite]
    return list(idiomas_garimpo) or ["pt"]


# Regra 6: escrita só no idioma do usuário (alfabeto latino).
def escrita_nao_latina(texto: str | None) -> bool:
    if not texto:
        return False
    letras = [c for c in texto if c.isalpha()]
    if len(letras) < 4:
        return False
    fora = sum(1 for c in letras if not unicodedata.name(c, "").startswith("LATIN"))
    return fora / len(letras) > 0.3


# Regra 7 do Radar: sinal barato de software antes da IA cara.
_SINAL_SOFTWARE = re.compile(
    r"\b(apps?|aplicativos?|sites?|websites?|tools?|ferramentas?|saas|software|plataforma|platform|"
    r"ia|ai|gpt|chatgpt|claude|gemini|automa\w*|link na bio|link in bio|extens(ão|ao|ion))\b"
    r"|\b[\w-]+\.(com|ai|io|app|co|so|dev|tech)(\.br)?\b",
    re.I,
)


def tem_sinal_software(*textos: str | None) -> bool:
    return any(t and _SINAL_SOFTWARE.search(t) for t in textos)


def hashtag_do_termo(termo: str) -> str:
    """'App para médicos' -> 'appparamedicos' (a hashtag equivalente da palavra)."""
    sem_acento = unicodedata.normalize("NFKD", termo).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sem_acento.lower())


def normalizar_termo(termo: str) -> str:
    return re.sub(r"\s+", " ", termo).strip().lower()


# Idioma de um texto (legenda de Reel): palavras comuns que só existem em uma das três línguas.
_PALAVRAS_IDIOMA = {
    "pt": set("você voce vocês voces não nao são sao então entao também tambem muito isso esse essa isto uma com pra "
              "seu sua meu minha mais quer aqui já só sem ainda faz fazer tem ter ele ela eu nós gente agora melhor "
              "dinheiro trabalho hoje porque quando onde".split()),
    "es": set("usted tú el los las del una con es muy pero qué aquí también más sin todavía hoy puedes tienes hola yo "
              "nosotros ahora mejor dinero trabajo cuando donde salud ustedes eres sos".split()),
    "en": set("the and you your this that with for is are how what my it to of in on we can just now money work "
              "today when where".split()),
}
_LETRAS_IDIOMA = {"pt": re.compile(r"[ãõç]", re.I), "es": re.compile(r"[ñ¿¡]", re.I)}


def idioma_do_texto(texto: str | None) -> str | None:
    """'pt', 'en' ou 'es' quando o texto deixa claro; None quando é curto ou misturado demais."""
    if not texto:
        return None
    palavras = re.findall(r"[a-záéíóúâêôãõçñü]+", texto.lower())
    pontos = {i: sum(p in conj for p in palavras) for i, conj in _PALAVRAS_IDIOMA.items()}
    for i, rx in _LETRAS_IDIOMA.items():
        pontos[i] += 2 * len(rx.findall(texto))
    ordem = sorted(pontos.items(), key=lambda x: -x[1])
    (melhor, p1), (_, p2) = ordem[0], ordem[1]
    return melhor if p1 >= 2 and p1 > p2 else None
