"""Ideias de EXEMPLO para a tela funcionar antes do extrator de SaaS.

Tudo aqui é inventado para demonstrar o layout e vai marcado como exemplo na tela.
Some quando o extrator e o agrupamento em ideias entrarem (docs/decisoes.md).
"""

from radar.nichos import NICHOS
from radar.notas import nota_ideia

_BASE = [
    ("e1", "IA que escreve o prontuário enquanto o médico fala", "saude", "Médicos perdem horas digitando prontuário depois de cada consulta.", "Médicos e clínicas", 3_400_000, 0.64, 9, 5, "assinatura", False),
    ("e2", "Assistente que responde clientes no WhatsApp sozinho", "vendas_marketing", "Pequenos negócios não dão conta de responder todo mundo a tempo.", "Lojas e prestadores de serviço", 5_800_000, 0.31, 14, 9, "assinatura", True),
    ("e3", "Corretor de redação com IA para vestibular", "educacao", "Aluno espera dias pela correção da redação.", "Estudantes de ensino médio", 1_200_000, 0.52, 6, 4, "freemium", None),
    ("e4", "Agenda online para salão com lembrete automático", "servicos_locais", "Clientes faltam e o salão perde o horário.", "Salões e barbearias", 820_000, 0.12, 5, 3, "assinatura", True),
    ("e5", "IA que transforma um vídeo longo em 10 cortes", "conteudo", "Criador gasta horas editando cortes para as redes.", "Criadores de conteúdo", 9_100_000, 0.08, 21, 14, "uso", True),
    ("e6", "Revisor de contrato com IA para advogados", "juridico", "Revisar contrato cláusula por cláusula toma o dia inteiro.", "Advogados autônomos", 640_000, 0.71, 4, 3, "assinatura", False),
    ("e7", "App que lê a nota fiscal e organiza os gastos", "financas", "Pessoa não sabe para onde vai o dinheiro do mês.", "Pessoas físicas", 2_300_000, 0.22, 8, 6, "freemium", None),
    ("e8", "Gerador de currículo que passa no filtro de RH", "rh", "Currículo é descartado pelo sistema antes de alguém ler.", "Quem procura emprego", 4_100_000, 0.41, 11, 8, "freemium", True),
    ("e9", "Anúncio de imóvel escrito e fotografado por IA", "imobiliario", "Corretor demora para montar cada anúncio.", "Corretores de imóveis", 390_000, None, 2, 2, "assinatura", None),
    ("e10", "Pesquisa de produto vencedor para loja virtual", "ecommerce", "Lojista testa produto no escuro e perde dinheiro em anúncio.", "Lojistas e dropshippers", 1_700_000, -0.05, 7, 5, "assinatura", True),
    ("e11", "Resumo automático de reuniões com tarefas", "produtividade", "Ninguém lembra o que foi combinado na reunião.", "Equipes pequenas", 2_900_000, 0.18, 10, 7, "freemium", True),
    ("e12", "Criador de app sem código só descrevendo a ideia", "dev", "Quem tem ideia de app não sabe programar.", "Empreendedores sem time técnico", 7_600_000, 0.58, 18, 12, "uso", False),
]


def ideias_exemplo() -> list[dict]:
    lista = []
    for (id_, titulo, nicho, problema, publico, views, cresc, videos, autores, modelo, br) in _BASE:
        lista.append({
            "id": f"exemplo-{id_}",
            "exemplo": True,
            "titulo_pt": titulo,
            "nicho": nicho,
            "nicho_rotulo": NICHOS[nicho][0],
            "problema": problema,
            "publico": publico,
            "views_total": views,
            "crescimento": cresc,
            "historia_7d": cresc is not None,
            "videos": videos,
            "autores": autores,
            "modelo": modelo,
            "tem_versao_br": br,
            "nota": nota_ideia(views, cresc, autores),
            "saas": [],
            "serie_30d": _serie(views, cresc),
        })
    return lista


def _serie(views: int, cresc: float | None) -> list[int]:
    """Curva suave e determinística só para desenhar o gráfico de exemplo."""
    c = cresc or 0.0
    diario = views / 30
    return [round(diario * (1 + c) ** ((d - 29) / 7)) for d in range(30)]
