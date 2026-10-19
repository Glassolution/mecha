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

# (palavra, idioma). O garimpo mistura o nicho com termos de software.
PALAVRAS: dict[str, list[tuple[str, str]]] = {
    "saude": [("app para médicos", "pt"), ("ai for doctors", "en"), ("medical saas", "en"), ("prontuário com ia", "pt"),
              ("clinic software", "en"), ("app para psicólogos", "pt"), ("ai for nurses", "en"), ("app para nutricionista", "pt")],
    "educacao": [("ai for students", "en"), ("app para estudar", "pt"), ("ai tutor app", "en"), ("ferramenta de ia para professores", "pt"),
                 ("study app", "en"), ("ai for teachers", "en"), ("site para estudar", "pt"), ("language learning app", "en")],
    "financas": [("app de finanças", "pt"), ("ai for accountants", "en"), ("budget app", "en"), ("app para controlar gastos", "pt"),
                 ("invoice software", "en"), ("ia para contador", "pt"), ("ai finance tool", "en"), ("app de investimento", "pt")],
    "vendas_marketing": [("ai marketing tool", "en"), ("ferramenta de ia para marketing", "pt"), ("crm app", "en"), ("ai for sales", "en"),
                         ("site que faz anúncios", "pt"), ("seo ai tool", "en"), ("ia para social media", "pt"), ("cold email ai", "en")],
    "conteudo": [("ai video editor", "en"), ("ia para editar vídeo", "pt"), ("ai thumbnail", "en"), ("ferramenta de ia para criadores", "pt"),
                 ("ai voice tool", "en"), ("ai for youtubers", "en"), ("site que faz legenda", "pt"), ("ai writing tool", "en")],
    "produtividade": [("ai productivity tool", "en"), ("app de produtividade", "pt"), ("ai note taker", "en"), ("ia para reuniões", "pt"),
                      ("ai meeting notes", "en"), ("automation tool", "en"), ("site que organiza", "pt"), ("ai calendar app", "en")],
    "dev": [("ai app builder", "en"), ("i built an app", "en"), ("vibe coding", "en"), ("criar app com ia", "pt"),
            ("no code app", "en"), ("ai coding tool", "en"), ("site que cria site", "pt"), ("saas idea", "en")],
    "juridico": [("ai for lawyers", "en"), ("ia para advogados", "pt"), ("legal ai tool", "en"), ("app para advogados", "pt"),
                 ("contract ai", "en"), ("ia jurídica", "pt"), ("law firm software", "en"), ("ai legal assistant", "en")],
    "imobiliario": [("ai for realtors", "en"), ("app para corretor de imóveis", "pt"), ("real estate ai tool", "en"), ("ia para imobiliária", "pt"),
                    ("property management app", "en"), ("realtor app", "en"), ("site para corretores", "pt"), ("airbnb host tool", "en")],
    "ecommerce": [("shopify app", "en"), ("ferramenta para loja virtual", "pt"), ("ai for ecommerce", "en"), ("dropshipping tool", "en"),
                  ("ia para e-commerce", "pt"), ("product research tool", "en"), ("app para vender online", "pt"), ("amazon seller tool", "en")],
    "rh": [("ai resume builder", "en"), ("ia para currículo", "pt"), ("ai for recruiters", "en"), ("app para recrutamento", "pt"),
           ("job search ai", "en"), ("ai interview tool", "en"), ("site que faz currículo", "pt"), ("hr software", "en")],
    "servicos_locais": [("app para salão de beleza", "pt"), ("restaurant software", "en"), ("app de agendamento", "pt"), ("booking app for salons", "en"),
                        ("gym management app", "en"), ("app para barbearia", "pt"), ("ai for restaurants", "en"), ("sistema para clínica", "pt")],
    "vida_pessoal": [("ai travel planner", "en"), ("app de viagem com ia", "pt"), ("ai recipe app", "en"), ("app para casais", "pt"),
                     ("ai dating app", "en"), ("app para mães", "pt"), ("ai fitness app", "en"), ("site que planeja viagem", "pt")],
    "outro": [],
}

GERAIS: list[tuple[str, str]] = [
    ("ai tool", "en"), ("saas idea", "en"), ("app that pays", "en"), ("i built an app", "en"),
    ("ferramenta de ia", "pt"), ("site que faz", "pt"), ("ai tools you need", "en"), ("sites que ninguém conhece", "pt"),
]


def palavras(nicho: str | None, idiomas: list[str], pagina: int = 0, por_pagina: int = 8) -> list[dict]:
    """8 ideias de palavras por vez, só nos idiomas pedidos."""
    base = PALAVRAS.get(nicho or "", []) + GERAIS if nicho else [p for lista in PALAVRAS.values() for p in lista] + GERAIS
    filtradas = [{"termo": t, "idioma": i} for t, i in base if not idiomas or i in idiomas]
    if not filtradas:
        return []
    inicio = (pagina * por_pagina) % len(filtradas)
    rodada = filtradas[inicio:] + filtradas[:inicio]
    return rodada[:por_pagina]
