"""Nicho provável de um vídeo por palavras-chave (grátis, sem IA).

Serve só como filtro do Explorar até o extrator de SaaS dar o nicho de cada SaaS citado.
"""

import re

_PALAVRAS: dict[str, list[str]] = {
    "saude": ["médic", "medic", "doctor", "clínic", "clinic", "paciente", "patient", "saúde", "health", "enferm", "nurse",
              "hospital", "psicólog", "psycholog", "terapeut", "therap", "nutri", "fisioter", "dentist", "medicina", "prontuário"],
    "educacao": ["estudante", "estudar", "student", "study", "professor", "teacher", "aula", "curso", "course", "escola",
                 "school", "faculdade", "college", "vestibular", "enem", "tutor", "aprender", "learn", "language learning"],
    "financas": ["finanç", "financ", "dinheiro", "money", "invest", "contab", "accountant", "accounting", "imposto", "tax",
                 "orçamento", "budget", "gastos", "nota fiscal", "invoice", "banco", "banking"],
    "vendas_marketing": ["marketing", "vendas", "vender", "sales", "crm", "anúncio", "ads", "leads", "seo", "social media",
                         "tráfego pago", "copywriting", "cold email", "clientes"],
    "conteudo": ["edição de vídeo", "editar vídeo", "video editor", "video editing", "thumbnail", "youtube", "criador de conteúdo",
                 "content creator", "podcast", "legenda", "captions", "gerar imagem", "image generator", "canva", "conteúdo"],
    "produtividade": ["produtiv", "productiv", "tarefas", "tasks", "agenda", "calendar", "reunião", "reuniões", "meeting",
                      "anotações", "note taking", "notion", "organizar", "organize", "automação", "automation", "planilha", "spreadsheet", "excel"],
    "dev": ["código", "coding", "programar", "programming", "developer", "desenvolvedor", "app builder", "no-code", "nocode",
            "no code", "cursor", "lovable", "vibe cod", "criar um app", "build an app", "i built"],
    "juridico": ["advog", "lawyer", "jurídic", "legal ai", "contrato", "contract", "direito", "law firm"],
    "imobiliario": ["imóve", "imobili", "real estate", "corretor", "realtor", "aluguel", "airbnb"],
    "ecommerce": ["loja virtual", "shopify", "e-commerce", "ecommerce", "dropship", "amazon seller", "shopee", "mercado livre", "lojista"],
    "rh": ["currículo", "resume", "vaga de emprego", "job search", "emprego", "entrevista de emprego", "job interview",
           "recrut", "recruit", "linkedin"],
    "servicos_locais": ["salão", "salon", "barbear", "barber", "restaurante", "restaurant", "academia", "gym owner",
                        "agendamento", "booking"],
    "vida_pessoal": ["viagem", "travel", "receita", "recipe", "cozinhar", "cooking", "namoro", "dating", "maternidade",
                     "parenting", "treino", "workout"],
}

_RX = {n: re.compile("|".join(re.escape(p) for p in ps), re.I) for n, ps in _PALAVRAS.items()}


def nichos_do_texto(*textos: str | None, maximo: int = 2) -> list[str]:
    """Até 2 nichos com mais palavras encontradas. Lista vazia quando nada bate."""
    texto = " ".join(t for t in textos if t)
    if not texto:
        return []
    pontos = {n: len(rx.findall(texto)) for n, rx in _RX.items()}
    achados = sorted((n for n, p in pontos.items() if p > 0), key=lambda n: -pontos[n])
    return achados[:maximo]
