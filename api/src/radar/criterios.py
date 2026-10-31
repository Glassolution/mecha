"""Os critérios de uma boa ideia de SaaS no Wae. A triagem, a análise do vídeo e o analista de
oportunidades usam a mesma régua: cada critério vale até 25 pontos e a nota é a soma (0 a 100).
"""

# (chave, nome curto que aparece na tela, o que o modelo deve julgar)
CRITERIOS: list[tuple[str, str, str]] = [
    ("dor_real", "Dor real",
     "Um problema concreto que a pessoa sente toda semana no trabalho, no negócio ou na rotina. "
     "Curiosidade, opinião ou entretenimento não contam."),
    ("quem_paga", "Quem paga",
     "Existe um público definido que já gasta tempo ou dinheiro com isso e pagaria por uma ferramenta: "
     "profissionais, donos de negócio, autônomos, estudantes de uma área."),
    ("replicavel", "Replicável",
     "Vira um produto de software simples e repetível, que uma pessoa ou time pequeno constrói em semanas. "
     "Serviço manual, consultoria, hardware ou rede social nova não contam."),
    ("vende_em_video", "Vende em vídeo",
     "Dá para mostrar em um vídeo curto (antes e depois, demonstração, problema e solução) e o formato pode "
     "ser refeito no TikTok e no Instagram para divulgar o produto."),
]

NOTA_POR_CRITERIO = 25


def texto_criterios() -> str:
    """Os critérios como texto para entrar nos prompts."""
    return "\n".join(f"- {nome} (0 a {NOTA_POR_CRITERIO}): {regra}" for _, nome, regra in CRITERIOS)
