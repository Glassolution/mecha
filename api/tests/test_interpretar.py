from radar.interpretar import area, expandir, expandir_todos


def test_pedido_de_medicina_vira_buscas_de_saude():
    buscas = expandir("encontrar saas de medicina")
    assert buscas == ["app para médicos", "prontuário com ia", "software para clínica", "app para psicólogos"]


def test_pedido_com_assunto_mantem_o_assunto_e_soma_a_area():
    assert expandir("quero ideias de saas para dentistas") == [
        "dentistas", "app para dentistas", "ia para dentistas", "app para médicos"]
    assert expandir("ideias de app para nutricionistas") == [
        "app para nutricionistas", "ia para nutricionistas", "app para médicos", "sistema para nutricionistas"]


def test_pedido_sem_area_conhecida_gera_variacoes():
    assert expandir("me mostre oportunidades para pet")[0] == "pet"
    assert expandir("ideias de saas para borracharia") == [
        "borracharia", "app para borracharia", "ia para borracharia", "sistema para borracharia"]


def test_palavra_sozinha_de_uma_area_fica_mais_variada():
    assert expandir("advocacia") == ["ia para advogados", "app para advogados", "ia jurídica", "contrato com ia"]


def test_busca_pronta_e_sugestao_passam_como_estao():
    assert expandir("app para médicos") == ["app para médicos"]
    assert expandir("ia para editar vídeo") == ["ia para editar vídeo"]
    assert expandir("crm") == ["crm", "app para crm", "ia para crm", "ia para marketing"]
    assert expandir("saas idea") == ["saas idea"]
    assert expandir("ai for doctors") == ["ai for doctors"]


def test_so_palavras_de_pedido_vira_busca_generica():
    assert expandir("ideias de saas") == ["ideia de saas", "micro saas", "eu criei um app"]


def test_criativos_so_limpam_o_pedido():
    assert expandir("encontrar anúncios de clínica", "criativo") == ["anúncios de clínica"]


def test_acentos_e_area():
    assert area("Clínica odontológica") == "saude"
    assert area("loja virtual") == "ecommerce"
    assert area("borracharia") is None


def test_varios_termos_sem_repetir_e_com_limite():
    buscas = expandir_todos(["encontrar saas de medicina", "app para médicos"])
    assert buscas.count("app para médicos") == 1
    assert len(expandir_todos([f"ideias para nicho{i}" for i in range(10)])) == 20
