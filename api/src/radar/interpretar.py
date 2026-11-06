"""Transforma pedidos em linguagem natural em buscas boas para o TikTok e o Instagram.

"encontrar saas de medicina" não rende nada se for buscado ao pé da letra. Aqui tiramos as
palavras de pedido ("encontrar", "saas de", "quero"...), reconhecemos a área (medicina -> saúde)
e trocamos a frase por algumas buscas variadas daquela área. Sem IA: rápido e de graça.
"""

import re
import unicodedata

from radar.nichos import GERAIS, PALAVRAS

MAX_POR_PEDIDO = 4  # cada busca custa uma coleta; um pedido vira no máximo 4


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


# palavras que só dizem o que a pessoa quer fazer, sem dizer o assunto
_PEDIDO = set("""
encontrar encontre encontra encontrem achar ache acha buscar busque busca procurar procure procura
pesquisar pesquise pesquisa quero queria gostaria preciso precisava me mostre mostrar mostra ver veja
descobrir descubra descobre gerar gere listar liste traga trazer sugira sugerir sugestoes sugestao
ideias ideia oportunidades oportunidade saas saases microsaas negocio negocios
exemplos exemplo algum alguma alguns algumas uns umas novo nova novos novas bom boa bons boas
melhor melhores top possiveis possivel interessantes interessante lucrativo lucrativos lucrativa lucrativas
""".split())
# conectores que sobram nas pontas depois de tirar o pedido ("de medicina" -> "medicina")
_CONECTORES = set(
    "de da do das dos para pra pro na no nas nos em sobre com e o a os as por que um uma "
    "voltado voltados voltada voltadas focado focados focada focadas".split()
)

# área (chave de nichos.PALAVRAS) -> começos de palavra, sem acento, que denunciam o assunto
_AREAS: dict[str, tuple[str, ...]] = {
    "saude": ("medic", "saude", "clinic", "hospital", "consultori", "pacient", "dentist", "odonto", "psicolog",
              "psiquiatr", "terapeut", "enferm", "farmac", "fisioterap", "nutri", "veterinar", "laborator",
              "telemedic", "cardiolog", "pediatr", "dermatolog", "fonoaudiolog", "doutor"),
    "educacao": ("educa", "escola", "estud", "professor", "aluno", "faculdade", "universid", "curso", "ensino",
                 "aula", "vestibular", "enem", "concurso"),
    "financas": ("financ", "dinheiro", "contab", "contador", "imposto", "investiment", "banco", "gasto", "orcament",
                 "fatura", "cobranca", "nota fiscal", "fintech", "credito"),
    "vendas_marketing": ("marketing", "venda", "vended", "anuncio", "trafego", "crm", "lead", "seo",
                         "redes sociais", "social media", "agencia"),
    "conteudo": ("conteudo", "criador", "influenc", "youtube", "edicao de video", "editor de video", "podcast",
                 "thumbnail", "legenda"),
    "produtividade": ("produtiv", "tarefa", "reuni", "anotac", "automac", "planilha"),
    "dev": ("programa", "programad", "desenvolved", "codigo", "no code", "nocode", "no-code"),
    "juridico": ("juridic", "advoga", "advocacia", "direito", "contrato", "cartorio"),
    "imobiliario": ("imove", "imobili", "corretor", "aluguel", "airbnb", "condominio", "construtora", "arquitet"),
    "ecommerce": ("ecommerce", "e-commerce", "loja virtual", "loja online", "dropshipping", "shopify", "marketplace",
                  "amazon", "shopee", "mercado livre"),
    "rh": ("recrut", "curriculo", "emprego", "vaga", "entrevista de emprego", "recursos humanos"),
    "servicos_locais": ("restaurant", "salao", "barbear", "academia", "estetica", "pet shop", "petshop",
                        "lanchonete", "padaria", "oficina", "mecanic", "manicure"),
    "vida_pessoal": ("viagem", "viagens", "receita", "culinaria", "namoro", "casais", "maternidade", "treino", "fitness"),
}


# nomes genéricos de área: sozinhos rendem pouco, então trocamos pelas buscas da área
_GENERICOS = set("""
medicina saude educacao ensino financas dinheiro marketing vendas juridico direito advocacia imoveis imobiliario
ecommerce e-commerce rh conteudo produtividade programacao tecnologia
""".split())


def _palavras(texto: str) -> list[str]:
    return re.findall(r"[\w-]+", texto.lower())


def _nucleo(termo: str) -> str:
    """O assunto da frase, sem as palavras de pedido e sem conectores soltos nas pontas."""
    palavras = [p for p in _palavras(termo) if _sem_acento(p) not in _PEDIDO]
    while palavras and _sem_acento(palavras[0]) in _CONECTORES:
        palavras.pop(0)
    while palavras and _sem_acento(palavras[-1]) in _CONECTORES:
        palavras.pop()
    return " ".join(palavras)


def area(texto: str) -> str | None:
    """A área que o texto menciona, se alguma."""
    plano = " " + _sem_acento(texto.lower()) + " "
    for chave, comecos in _AREAS.items():
        for c in comecos:
            if re.search(rf"(?<![\w]){re.escape(c)}", plano):
                return chave
    return None


# sugestões da Cleo (em português e no equivalente em inglês) já são buscas prontas
_PRONTAS = {s for lista in [*PALAVRAS.values(), GERAIS] for par in lista for s in par}
_SAAS = {"saas", "saases", "microsaas"}
_APP = re.compile(r"^(app|apps|aplicativo|ia|sistema|software|site|plataforma|ferramenta)\s+(para|pra|de|do|da|na|no)\s+")


def e_pedido(termo: str) -> bool:
    """Parece um pedido escrito ("encontrar saas de medicina"), não uma busca pronta ("app para médicos")."""
    if termo in _PRONTAS:
        return False
    palavras = [_sem_acento(p) for p in _palavras(termo)]
    if any(p in _PEDIDO and p not in _SAAS for p in palavras) or len(palavras) >= 6:
        return True
    return bool(re.search(r"\bsaas\s+(de|da|do|para|pra|na|no|em)\b", _sem_acento(termo.lower())))


def expandir(termo: str, modo: str = "ideia") -> list[str]:
    """Uma entrada vira de 1 a 4 buscas. Buscas prontas (e as sugestões da Cleo) passam como estão."""
    pedido = e_pedido(termo)
    nucleo = _nucleo(termo) if pedido else termo
    if not nucleo:  # só palavras de pedido ("ideias de saas"): busca genérica de ideias
        return ["ideia de saas", "micro saas", "eu criei um app"] if modo == "ideia" else [termo]
    if modo != "ideia":  # criativos: só limpa o pedido
        return [nucleo]
    chave = area(nucleo)
    sozinha = len(nucleo.split()) == 1
    if not pedido and not (chave and sozinha and termo not in _PRONTAS):
        return [termo]
    if sozinha and _sem_acento(nucleo) in _GENERICOS:  # "medicina": as buscas da área rendem mais
        return [pt for pt, _ in PALAVRAS[chave]][:MAX_POR_PEDIDO] if chave else [nucleo]
    # assunto específico: primeiro variações dele, depois uma busca da área para abrir o leque
    base = _APP.sub("", nucleo)
    buscas = [nucleo]
    if len(base.split()) <= 4:
        buscas += [f"app para {base}", f"ia para {base}", f"sistema para {base}"]
    if chave:
        buscas.insert(min(3, len(buscas)), PALAVRAS[chave][0][0])
    return list(dict.fromkeys(buscas))[:MAX_POR_PEDIDO]


def expandir_todos(termos: list[str], modo: str = "ideia", limite: int = 20) -> list[str]:
    saida: list[str] = []
    for t in termos:
        saida += expandir(t, modo)
    return list(dict.fromkeys(saida))[:limite]
