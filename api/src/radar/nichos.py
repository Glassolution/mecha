"""Nichos (docs/radar-saas.md seção 6) e palavras de partida do garimpo (seção 5)."""

NICHOS: dict[str, tuple[str, str]] = {  # chave -> (rótulo na tela, descrição para o modelo)
    "saude": ("Saúde e medicina", "Clinics, doctors, patients, health records, telemedicine, mental health, fitness tracking."),
    "educacao": ("Educação", "Studying, teachers, courses, tutoring, language learning."),
    "financas": ("Finanças", "Personal finance, accounting, invoicing, taxes, investing."),
    "vendas_marketing": ("Vendas e marketing", "Sales, CRM, ads, social media, SEO, email."),
    "conteudo": ("Criação de conteúdo", "Video, image, writing, thumbnails, podcasts, editing."),
    "produtividade": ("Produtividade", "Notes, tasks, calendar, meetings, documents, automation."),
    "dev": ("Programação e no-code", "Coding, app builders, websites, developer tools."),
    "juridico": ("Jurídico", "Lawyers, contracts, compliance."),
    "imobiliario": ("Imobiliário", "Real estate agents, rentals, property management."),
    "ecommerce": ("E-commerce", "Online stores, dropshipping, marketplaces, product research."),
    "rh": ("RH e carreira", "Hiring, resumes, job search, team management."),
    "servicos_locais": ("Negócios locais", "Restaurants, salons, gyms, booking and local service businesses."),
    "vida_pessoal": ("Vida pessoal", "Dating, travel, cooking, parenting, hobbies."),
    "outro": ("Outros", "Anything else."),
}

# Colunas do catálogo do Explorar (estilo Framer): grupo -> nichos
GRUPOS: list[tuple[str, list[str]]] = [
    ("Negócios", ["vendas_marketing", "financas", "juridico", "rh"]),
    ("Criação", ["conteudo", "produtividade", "dev"]),
    ("Setores", ["saude", "educacao", "imobiliario", "ecommerce"]),
    ("Dia a dia", ["servicos_locais", "vida_pessoal"]),
]

# (palavra em português, equivalente em inglês). A tela só mostra o português; quando o espaço quer ver
# também o que bomba em inglês, o garimpo busca o equivalente por trás (docs/decisoes.md, item 16).
PALAVRAS: dict[str, list[tuple[str, str]]] = {
    "saude": [("app para médicos", "ai for doctors"), ("prontuário com ia", "ai medical scribe"), ("software para clínica", "clinic software"),
              ("app para psicólogos", "app for therapists"), ("ia para enfermagem", "ai for nurses"), ("app para nutricionista", "app for nutritionists"),
              ("saas para saúde", "medical saas"), ("ia na medicina", "ai in medicine")],
    "educacao": [("ia para estudantes", "ai for students"), ("app para estudar", "study app"), ("tutor com ia", "ai tutor app"),
                 ("ia para professores", "ai for teachers"), ("site para estudar", "study website"), ("app para aprender inglês", "language learning app"),
                 ("ia para fazer trabalho", "ai for homework"), ("app de flashcards", "flashcard app")],
    "financas": [("app de finanças", "budget app"), ("ia para contador", "ai for accountants"), ("app para controlar gastos", "expense tracker app"),
                 ("sistema de nota fiscal", "invoice software"), ("ia para finanças", "ai finance tool"), ("app de investimento", "investing app"),
                 ("app para declarar imposto", "tax app"), ("planilha com ia", "ai spreadsheet")],
    "vendas_marketing": [("ia para marketing", "ai marketing tool"), ("crm para pequenas empresas", "crm app"), ("ia para vendas", "ai for sales"),
                         ("site que faz anúncios", "ai ad generator"), ("ia para seo", "seo ai tool"), ("ia para social media", "ai for social media"),
                         ("e-mail frio com ia", "cold email ai"), ("ia para copy", "ai copywriting")],
    "conteudo": [("ia para editar vídeo", "ai video editor"), ("ia para thumbnail", "ai thumbnail"), ("ferramenta de ia para criadores", "ai tools for creators"),
                 ("ia de voz", "ai voice tool"), ("ia para youtubers", "ai for youtubers"), ("site que faz legenda", "ai captions"),
                 ("ia para escrever", "ai writing tool"), ("ia que faz cortes", "ai clips")],
    "produtividade": [("app de produtividade", "productivity app"), ("ia para anotações", "ai note taker"), ("ia para reuniões", "ai meeting notes"),
                      ("ferramenta de automação", "automation tool"), ("site que organiza tarefas", "task manager app"), ("agenda com ia", "ai calendar app"),
                      ("ia para e-mail", "ai email assistant"), ("ferramentas de produtividade", "productivity tools")],
    "dev": [("criar app com ia", "ai app builder"), ("eu criei um app", "i built an app"), ("programar com ia", "vibe coding"),
            ("app sem código", "no code app"), ("ia para programar", "ai coding tool"), ("site que cria site", "ai website builder"),
            ("ideia de saas", "saas idea"), ("micro saas", "micro saas")],
    "juridico": [("ia para advogados", "ai for lawyers"), ("app para advogados", "legal app"), ("ia jurídica", "legal ai tool"),
                 ("contrato com ia", "contract ai"), ("sistema para escritório de advocacia", "law firm software"), ("assistente jurídico com ia", "ai legal assistant")],
    "imobiliario": [("ia para corretor de imóveis", "ai for realtors"), ("app para corretor de imóveis", "realtor app"), ("ia para imobiliária", "real estate ai tool"),
                    ("app para administrar imóveis", "property management app"), ("ferramenta para airbnb", "airbnb host tool"), ("site para corretores", "real estate website builder")],
    "ecommerce": [("app para shopify", "shopify app"), ("ferramenta para loja virtual", "ecommerce tool"), ("ia para e-commerce", "ai for ecommerce"),
                  ("ferramenta de dropshipping", "dropshipping tool"), ("pesquisa de produto", "product research tool"), ("app para vender online", "selling app"),
                  ("ferramenta para vendedor da amazon", "amazon seller tool")],
    "rh": [("currículo com ia", "ai resume builder"), ("ia para recrutadores", "ai for recruiters"), ("app para recrutamento", "recruiting app"),
           ("ia para procurar emprego", "job search ai"), ("ia para entrevista de emprego", "ai interview tool"), ("site que faz currículo", "resume website"),
           ("sistema de rh", "hr software")],
    "servicos_locais": [("app para salão de beleza", "salon booking app"), ("sistema para restaurante", "restaurant software"), ("app de agendamento", "booking app"),
                        ("app para academia", "gym management app"), ("app para barbearia", "barbershop app"), ("ia para restaurantes", "ai for restaurants"),
                        ("sistema para clínica", "clinic management software")],
    "vida_pessoal": [("app de viagem com ia", "ai travel planner"), ("app de receitas com ia", "ai recipe app"), ("app para casais", "app for couples"),
                     ("app de namoro com ia", "ai dating app"), ("app para mães", "app for moms"), ("app de treino com ia", "ai fitness app"),
                     ("site que planeja viagem", "trip planner website")],
    "outro": [],
}

GERAIS: list[tuple[str, str]] = [
    ("ferramenta de ia", "ai tool"), ("ideia de saas", "saas idea"), ("app que dá dinheiro", "app that pays"),
    ("eu criei um app", "i built an app"), ("ferramentas de ia que você precisa", "ai tools you need"),
    ("sites que ninguém conhece", "websites nobody knows"), ("site que faz", "websites that do"), ("ia que faz o seu trabalho", "ai that does your job"),
]

EQUIVALENTE_EN: dict[str, str] = {pt: en for lista in [*PALAVRAS.values(), GERAIS] for pt, en in lista}


def palavras(nicho: str | None, pagina: int = 0, por_pagina: int = 8) -> list[dict]:
    """8 ideias de palavras por vez, sempre em português."""
    base = PALAVRAS.get(nicho or "", []) + GERAIS if nicho else [p for lista in PALAVRAS.values() for p in lista] + GERAIS
    vistos, unicas = set(), []
    for pt, _ in base:
        if pt not in vistos:
            vistos.add(pt)
            unicas.append({"termo": pt, "idioma": "pt"})
    if not unicas:
        return []
    inicio = (pagina * por_pagina) % len(unicas)
    rodada = unicas[inicio:] + unicas[:inicio]
    return rodada[:por_pagina]
