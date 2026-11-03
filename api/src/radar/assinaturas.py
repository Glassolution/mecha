"""Assinaturas pelo Asaas: assinar, trocar de plano, cancelar, reembolsar e os avisos que mudam o plano.

O acesso pago só é liberado por um aviso do Asaas (PAYMENT_CONFIRMED ou PAYMENT_RECEIVED), nunca pela volta
do navegador. Cada aviso é gravado antes do 200 e processado uma vez só, no trabalhador.
"""

import logging
import re
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from radar import asaas, db
from radar.asaas import ErroAsaas
from radar.config import config
from radar.planos import PLANOS

log = logging.getLogger(__name__)

BRASILIA = timezone(timedelta(hours=-3))  # sem horário de verão desde 2019
VIVAS = ("aguardando", "ativa", "atrasada")
PAGAVEIS = ("pro", "agencia")
FORMAS = {"pix": "PIX", "cartao": "CREDIT_CARD"}
STATUS_PAGO = ("CONFIRMED", "RECEIVED")
LIMITE_TENTATIVAS_CARTAO = 5  # por espaço, em 24 horas
# estorno total ou contestação no cartão: o acesso acaba na hora
CORTAM_ACESSO = ("PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE",
                 "PAYMENT_AWAITING_CHARGEBACK_REVERSAL")


def hoje() -> date:
    return datetime.now(BRASILIA).date()


# ---------- CPF e CNPJ ----------

def limpar_documento(valor: str) -> str:
    return re.sub(r"[\s./-]", "", valor or "").upper()


def documento_valido(doc: str) -> bool:
    """CPF (11 dígitos) ou CNPJ (14, também o alfanumérico de 2026), com os dígitos verificadores."""
    if re.fullmatch(r"\d{11}", doc):
        if len(set(doc)) == 1:
            return False
        for n in (9, 10):
            soma = sum(int(doc[i]) * (n + 1 - i) for i in range(n))
            if soma * 10 % 11 % 10 != int(doc[n]):
                return False
        return True
    if re.fullmatch(r"[0-9A-Z]{12}\d{2}", doc):
        if len(set(doc)) == 1:
            return False
        valores = [ord(c) - 48 for c in doc]
        pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        for n in (12, 13):
            soma = sum(v * p for v, p in zip(valores[:n], pesos[13 - n:]))
            dv = 0 if soma % 11 < 2 else 11 - soma % 11
            if dv != valores[n]:
                return False
        return True
    return False


# ---------- datas do acesso ----------

def _mais_um_mes(d: date) -> date:
    ano, mes = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    for dia in range(d.day, 27, -1):  # 31/01 vira 28 ou 29/02
        try:
            return date(ano, mes, dia)
        except ValueError:
            continue
    return date(ano, mes, d.day)


def acesso_ate(vencimento: date) -> datetime:
    """Um mês depois do vencimento pago, mais a tolerância, até o fim do dia em Brasília."""
    fim = _mais_um_mes(vencimento) + timedelta(days=config().tolerancia_dias)
    return datetime.combine(fim, time(23, 59, 59), BRASILIA)


def _pode_reembolsar(a: dict) -> bool:
    if a["status"] not in ("ativa", "atrasada", "cancelada") or not a["primeiro_pagamento_em"]:
        return False
    return datetime.now(timezone.utc) - a["primeiro_pagamento_em"] <= timedelta(days=config().dias_arrependimento)


async def resumo(espaco_id) -> dict | None:
    """A assinatura mais recente do espaço, do jeito que a tela precisa."""
    a = await db.um("select * from assinaturas where espaco_id = %s order by criado_em desc limit 1", (espaco_id,))
    if not a:
        return None
    return {
        "id": a["id"], "plano": a["plano"], "forma": a["forma"], "status": a["status"], "pago_ate": a["pago_ate"],
        "link_pagamento": a["link_pagamento"] if a["status"] == "aguardando" else None,
        "pode_reembolsar": _pode_reembolsar(a),
    }


# ---------- assinar ----------

def _erro_http(e: ErroAsaas) -> HTTPException:
    if e.status >= 500:
        return HTTPException(502, "O sistema de pagamentos não respondeu. Tente de novo em 1 minuto.")
    return HTTPException(422, e.mensagem)


async def _apagar_no_asaas(asaas_assinatura: str | None) -> None:
    """Remove a assinatura no Asaas (o Asaas também remove as cobranças ainda não pagas)."""
    if not asaas_assinatura:
        return
    try:
        await asaas.pedir("DELETE", f"/subscriptions/{asaas_assinatura}")
    except ErroAsaas as e:
        if e.status != 404:  # já removida
            raise


async def _primeiro_pagamento(asaas_assinatura: str) -> dict | None:
    """A cobrança mais antiga da assinatura (a do primeiro mês)."""
    r = await asaas.pedir("GET", f"/subscriptions/{asaas_assinatura}/payments")
    cobrancas = sorted(r.get("data") or [], key=lambda p: p.get("dueDate") or "")
    return cobrancas[0] if cobrancas else None


async def _pix(a: dict) -> dict:
    """QR Code e copia e cola do primeiro pagamento, para pagar sem sair do site."""
    p = await _primeiro_pagamento(a["asaas_assinatura"])
    if not p or p.get("status") not in ("PENDING", "OVERDUE"):
        raise HTTPException(502, "A cobrança Pix ainda não ficou pronta. Tente de novo em 1 minuto.")
    qr = await asaas.pedir("GET", f"/payments/{p['id']}/pixQrCode")
    if not qr.get("payload"):
        raise HTTPException(502, "A cobrança Pix ainda não ficou pronta. Tente de novo em 1 minuto.")
    # a fatura do Asaas fica de reserva (Configurações → Continuar pagamento)
    await db.executar("update assinaturas set link_pagamento = %s where id = %s", (p.get("invoiceUrl"), a["id"]))
    return {"forma": "pix", "pix": {"imagem": qr.get("encodedImage"), "copia_e_cola": qr["payload"],
                                    "expira_em": qr.get("expirationDate")}}


async def pix_pendente(espaco_id) -> dict:
    a = await db.um("select * from assinaturas where espaco_id = %s and status = 'aguardando' and forma = 'pix'",
                    (espaco_id,))
    if not a or not a["asaas_assinatura"]:
        raise HTTPException(404, "Você não tem um Pix aguardando pagamento.")
    try:
        return await _pix(a)
    except ErroAsaas as erro:
        raise _erro_http(erro) from erro


# ---------- cartão (checkout transparente) ----------
# Os dados do cartão só passam por aqui a caminho do Asaas: nunca são gravados nem vão para o log.

def _digitos(valor: str | None) -> str:
    return re.sub(r"\D", "", valor or "")


def _luhn(numero: str) -> bool:
    soma = 0
    for i, c in enumerate(reversed(numero)):
        n = int(c) * (2 if i % 2 else 1)
        soma += n - 9 if n > 9 else n
    return soma % 10 == 0


def dados_do_cartao(cartao: dict, e: dict, documento: str) -> dict:
    """Confere o que a pessoa digitou e monta creditCard e creditCardHolderInfo como o Asaas pede."""
    numero = _digitos(cartao.get("numero"))
    if not 13 <= len(numero) <= 19 or not _luhn(numero):
        raise HTTPException(422, "Confira o número do cartão.")
    validade = re.fullmatch(r"\s*(\d{1,2})\s*/\s*(\d{2}|\d{4})\s*", cartao.get("validade") or "")
    if not validade or not 1 <= int(validade[1]) <= 12:
        raise HTTPException(422, "Confira a validade do cartão (mês/ano).")
    mes, ano = int(validade[1]), int(validade[2]) + (2000 if len(validade[2]) == 2 else 0)
    if (ano, mes) < (hoje().year, hoje().month):
        raise HTTPException(422, "Esse cartão está vencido.")
    cvv = _digitos(cartao.get("cvv"))
    if len(cvv) not in (3, 4):
        raise HTTPException(422, "Confira o código de segurança do cartão.")
    titular = (cartao.get("titular") or "").strip()
    if len(titular) < 3:
        raise HTTPException(422, "Escreva o nome como está impresso no cartão.")
    cep, telefone = _digitos(cartao.get("cep")), _digitos(cartao.get("telefone"))
    if len(cep) != 8:
        raise HTTPException(422, "Confira o CEP.")
    if len(telefone) not in (10, 11):
        raise HTTPException(422, "Confira o telefone com DDD.")
    numero_endereco = (cartao.get("numero_endereco") or "").strip()
    if not numero_endereco:
        raise HTTPException(422, "Informe o número do endereço (ou S/N).")
    return {
        "creditCard": {"holderName": titular, "number": numero, "expiryMonth": f"{mes:02d}",
                       "expiryYear": str(ano), "ccv": cvv},
        "creditCardHolderInfo": {"name": titular, "email": e["email"], "cpfCnpj": documento, "postalCode": cep,
                                 "addressNumber": numero_endereco[:20], "phone": telefone},
    }


async def _contar_tentativa(espaco_id) -> None:
    """Limita as tentativas com cartão: sem isso, a tela vira um teste de cartão roubado."""
    r = await db.um("select count(*) as n from tentativas_cartao where espaco_id = %s and criado_em > now() - interval '1 day'",
                    (espaco_id,))
    if r["n"] >= LIMITE_TENTATIVAS_CARTAO:
        raise HTTPException(429, "Muitas tentativas com cartão hoje. Tente de novo amanhã ou pague com Pix.")
    await db.executar("insert into tentativas_cartao (espaco_id) values (%s)", (espaco_id,))


async def _recuperar_pedido(a: dict) -> dict | None:
    """Pedido que ficou sem resposta do Asaas: procura pela nossa referência antes de criar outro."""
    r = await asaas.pedir("GET", "/subscriptions", params={"externalReference": str(a["id"])})
    achada = next((s for s in r.get("data") or [] if not s.get("deleted")), None)
    if not achada:
        await db.executar("delete from assinaturas where id = %s", (a["id"],))
        return None
    await db.executar("update assinaturas set asaas_assinatura = %s, atualizado_em = now() where id = %s",
                      (achada["id"], a["id"]))
    return {**a, "asaas_assinatura": achada["id"]}


async def _cliente(e: dict, documento: str) -> str:
    atual = await db.um("select asaas_cliente from espacos where id = %s", (e["id"],))
    if atual and atual["asaas_cliente"]:
        # o documento pode ter mudado desde a última assinatura
        await asaas.pedir("PUT", f"/customers/{atual['asaas_cliente']}", json={"cpfCnpj": documento})
        return atual["asaas_cliente"]
    novo = await asaas.pedir("POST", "/customers", json={
        "name": e.get("conta_nome") or e["email"].split("@")[0], "email": e["email"], "cpfCnpj": documento,
        "externalReference": str(e["id"]),
    })
    await db.executar("update espacos set asaas_cliente = %s where id = %s", (novo["id"], e["id"]))
    return novo["id"]


async def assinar(e: dict, plano: str, forma: str, documento: str, cartao: dict | None = None,
                 ip: str | None = None) -> dict:
    """Começa (ou retoma) a assinatura sem sair do site (checkout transparente).

    Pix: devolve o QR Code e o copia e cola. Cartão: o Asaas cobra na hora e devolve "processando".
    Em qualquer caso o plano só muda quando o aviso do Asaas chegar. Plano trocado numa assinatura ativa: sem cobrança.
    """
    if not asaas.configurado():
        raise HTTPException(503, "As assinaturas ainda não estão disponíveis.")
    if plano not in PAGAVEIS or forma not in FORMAS:
        raise HTTPException(422, "Escolha um plano e uma forma de pagamento.")
    documento = limpar_documento(documento)
    if not documento_valido(documento):
        raise HTTPException(422, "Confira o CPF ou CNPJ informado.")

    try:
        viva = await db.um("select * from assinaturas where espaco_id = %s and status in ('aguardando','ativa','atrasada')",
                           (e["id"],))
        if viva and viva["status"] in ("ativa", "atrasada"):
            if viva["plano"] == plano:
                raise HTTPException(409, f"Você já assina o plano {PLANOS[plano]['nome']}.")
            return await _trocar_plano(e, viva, plano)
        if viva and not viva["asaas_assinatura"]:
            viva = await _recuperar_pedido(viva)
        if viva:
            if viva["plano"] == plano and viva["forma"] == forma == "pix":
                return await _pix(viva)
            if viva["forma"] == "cartao":
                p = await _primeiro_pagamento(viva["asaas_assinatura"])
                if p and p.get("status") not in ("PENDING", "OVERDUE"):
                    # o cartão já foi cobrado (ou está em análise): nada de cobrar de novo
                    return {"forma": "cartao", "situacao": "processando"}
            # outro plano ou forma antes de pagar: troca o pedido em aberto por um novo
            await _apagar_no_asaas(viva["asaas_assinatura"])
            await db.executar("update assinaturas set status = 'cancelada', atualizado_em = now() where id = %s",
                              (viva["id"],))

        corpo = {}
        if forma == "cartao":
            if not cartao:
                raise HTTPException(422, "Preencha os dados do cartão.")
            if not ip:
                raise HTTPException(422, "Não deu para identificar sua conexão. Recarregue a página e tente de novo.")
            corpo = {**dados_do_cartao(cartao, e, documento), "remoteIp": ip}
            await _contar_tentativa(e["id"])

        try:
            nova = await db.um("insert into assinaturas (espaco_id, plano, forma) values (%s, %s, %s) returning *",
                               (e["id"], plano, forma))
        except UniqueViolation:  # o índice único segura dois cliques ao mesmo tempo
            raise HTTPException(409, "Já existe um pedido de assinatura em andamento. Tente de novo em 1 minuto.")
        try:
            cliente = await _cliente(e, documento)
            # cartão: com nextDueDate hoje, o Asaas cobra na hora; recusado volta 400 e nada é criado
            criada = await asaas.pedir("POST", "/subscriptions", json={
                "customer": cliente, "billingType": FORMAS[forma], "value": PLANOS[plano]["preco_mensal_centavos"] / 100,
                "nextDueDate": hoje().isoformat(), "cycle": "MONTHLY",
                "description": f"Cleo · plano {PLANOS[plano]['nome']}", "externalReference": str(nova["id"]),
                **corpo,
            })
        except ErroAsaas as erro:
            if erro.status != 504:  # recusado com certeza: o pedido sai. Sem resposta: fica para _recuperar_pedido
                await db.executar("delete from assinaturas where id = %s", (nova["id"],))
            raise
        nova = {**nova, "asaas_assinatura": criada["id"]}
        await db.executar("update assinaturas set asaas_assinatura = %s, atualizado_em = now() where id = %s",
                          (criada["id"], nova["id"]))
        if forma == "cartao":
            return {"forma": "cartao", "situacao": "processando"}
        return await _pix(nova)
    except ErroAsaas as erro:
        raise _erro_http(erro) from erro


async def _trocar_plano(e: dict, a: dict, plano: str) -> dict:
    """Muda o valor das próximas cobranças e o plano na hora (sem cobrança proporcional)."""
    await asaas.pedir("PUT", f"/subscriptions/{a['asaas_assinatura']}", json={
        "value": PLANOS[plano]["preco_mensal_centavos"] / 100, "description": f"Cleo · plano {PLANOS[plano]['nome']}",
        "updatePendingPayments": True,
    })
    async with db.conexao() as con:
        await con.execute("update assinaturas set plano = %s, atualizado_em = now() where id = %s", (plano, a["id"]))
        await con.execute("update espacos set plano = %s where id = %s", (plano, e["id"]))
    return {"url": None, "plano": plano}


# ---------- cancelar e reembolsar ----------

async def cancelar(e: dict) -> dict:
    """Para de renovar. O acesso continua até o fim do período pago."""
    viva = await db.um("select * from assinaturas where espaco_id = %s and status in ('aguardando','ativa','atrasada')",
                       (e["id"],))
    if not viva:
        raise HTTPException(404, "Você não tem uma assinatura ativa.")
    try:
        await _apagar_no_asaas(viva["asaas_assinatura"])
    except ErroAsaas as erro:
        raise _erro_http(erro) from erro
    await db.executar("update assinaturas set status = 'cancelada', link_pagamento = null, atualizado_em = now() where id = %s",
                      (viva["id"],))
    return {"ok": True, "pago_ate": viva["pago_ate"]}


async def reembolsar(assinatura_id, *, pela_pessoa: bool, espaco_id=None) -> dict:
    """Estorna no Asaas, encerra a assinatura e corta o acesso.

    Pela pessoa: só dentro dos dias de arrependimento, e estorna tudo o que ela pagou.
    Pelo admin: a qualquer momento, estorna o último pagamento.
    """
    a = await db.um("select * from assinaturas where id = %s", (assinatura_id,))
    if not a or (espaco_id is not None and a["espaco_id"] != espaco_id):
        raise HTTPException(404, "Assinatura não encontrada.")
    if a["status"] == "reembolsada":
        raise HTTPException(409, "Essa assinatura já foi reembolsada.")
    if pela_pessoa and not _pode_reembolsar(a):
        raise HTTPException(403, f"O reembolso pela conta vale até {config().dias_arrependimento} dias depois do "
                                 "primeiro pagamento. Fale com o suporte.")
    pagos = await db.todos(
        """select * from pagamentos where assinatura_id = %s and status in ('CONFIRMED','RECEIVED')
           and estornado_centavos < valor_centavos order by pago_em desc nulls last""",
        (a["id"],),
    )
    if not pagos:
        raise HTTPException(409, "Nenhum pagamento confirmado para reembolsar.")
    try:
        for p in pagos if pela_pessoa else pagos[:1]:
            await asaas.pedir("POST", f"/payments/{p['id']}/refund",
                              json={"description": "Reembolso pedido pela pessoa" if pela_pessoa else "Reembolso pelo suporte"})
            await db.executar("update pagamentos set status = 'REFUND_REQUESTED', atualizado_em = now() where id = %s",
                              (p["id"],))
        if a["status"] in VIVAS:
            await _apagar_no_asaas(a["asaas_assinatura"])
    except ErroAsaas as erro:
        raise _erro_http(erro) from erro
    async with db.conexao() as con:
        await _cortar_acesso(con, a)
    return {"ok": True}


async def _cortar_acesso(con, a: dict) -> None:
    await con.execute(
        "update assinaturas set status = 'reembolsada', pago_ate = now(), link_pagamento = null, atualizado_em = now() where id = %s",
        (a["id"],),
    )
    # volta ao Grátis, a não ser que outra assinatura do espaço ainda dê acesso
    await con.execute(
        """update espacos set plano = 'gratis' where id = %s and not exists (
             select 1 from assinaturas where espaco_id = %s and id <> %s
             and status in ('ativa','atrasada','cancelada') and pago_ate > now())""",
        (a["espaco_id"], a["espaco_id"], a["id"]),
    )


# ---------- avisos do Asaas ----------

async def guardar_evento(dados: dict) -> str | None:
    """Grava o aviso (reenvio com o mesmo id não duplica). Devolve o id se for novo."""
    r = await db.um(
        "insert into asaas_eventos (id, tipo, dados) values (%s, %s, %s) on conflict (id) do nothing returning id",
        (dados["id"], dados["event"], Jsonb(dados)),
    )
    return r["id"] if r else None


async def processar_evento(evento_id: str) -> None:
    async with db.conexao() as con:
        async with con.transaction():
            cur = await con.execute(
                "select * from asaas_eventos where id = %s and status = 'pendente' for update skip locked", (evento_id,))
            ev = await cur.fetchone()
            if not ev:
                return
            try:
                async with con.transaction():  # savepoint: um erro desfaz só a regra, o registro do erro fica
                    await _aplicar(con, ev["tipo"], ev["dados"])
                await con.execute("update asaas_eventos set status = 'feito', processado_em = now() where id = %s",
                                  (evento_id,))
            except Exception as erro:
                log.exception("aviso do Asaas %s (%s) falhou", evento_id, ev["tipo"])
                await con.execute("update asaas_eventos set status = 'erro', erro = %s, processado_em = now() where id = %s",
                                  (str(erro)[:500], evento_id))


async def processar_pendentes(limite: int = 100) -> int:
    pendentes = await db.todos(
        "select id from asaas_eventos where status = 'pendente' order by recebido_em limit %s", (limite,))
    for p in pendentes:
        await processar_evento(p["id"])
    return len(pendentes)


def _centavos(valor) -> int:
    return round(float(valor or 0) * 100)


async def _guardar_pagamento(con, a: dict, p: dict) -> None:
    estornado = sum(_centavos(r.get("value")) for r in p.get("refunds") or [] if r.get("status") == "DONE")
    pago_em = p.get("clientPaymentDate") or p.get("paymentDate") or p.get("confirmedDate")
    await con.execute(
        """insert into pagamentos (id, assinatura_id, espaco_id, valor_centavos, forma, status, vencimento, pago_em, estornado_centavos)
           values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           on conflict (id) do update set valor_centavos = excluded.valor_centavos, forma = excluded.forma,
             status = excluded.status, vencimento = excluded.vencimento,
             pago_em = coalesce(excluded.pago_em, pagamentos.pago_em),
             estornado_centavos = greatest(excluded.estornado_centavos, pagamentos.estornado_centavos),
             atualizado_em = now()""",
        (p["id"], a["id"], a["espaco_id"], _centavos(p.get("value")), p.get("billingType"), p.get("status") or "?",
         p.get("dueDate"), pago_em, estornado),
    )


async def _aplicar(con, tipo: str, dados: dict) -> None:
    if tipo.startswith("PAYMENT_"):
        p = dados.get("payment") or {}
        if not p.get("subscription"):
            return  # cobrança avulsa: não é nossa assinatura
        cur = await con.execute("select * from assinaturas where asaas_assinatura = %s for update", (p["subscription"],))
        a = await cur.fetchone()
        if not a:
            log.info("aviso %s de uma assinatura que não conhecemos (%s)", tipo, p["subscription"])
            return
        await _guardar_pagamento(con, a, p)
        if tipo in ("PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"):
            await _pagamento_entrou(con, a, p)
        elif tipo == "PAYMENT_OVERDUE":
            await con.execute("update assinaturas set status = 'atrasada', atualizado_em = now() where id = %s and status = 'ativa'",
                              (a["id"],))
        elif tipo in CORTAM_ACESSO and a["status"] != "reembolsada":
            if a["status"] in VIVAS:
                try:  # contestação: não deixa gerar mais cobranças
                    await _apagar_no_asaas(a["asaas_assinatura"])
                except ErroAsaas:
                    log.warning("não deu para remover a assinatura %s no Asaas", a["asaas_assinatura"])
            await _cortar_acesso(con, a)
    elif tipo in ("SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"):
        s = dados.get("subscription") or {}
        await con.execute(
            """update assinaturas set status = 'cancelada', link_pagamento = null, atualizado_em = now()
               where asaas_assinatura = %s and status in ('aguardando','ativa','atrasada')""",
            (s.get("id"),),
        )


async def _pagamento_entrou(con, a: dict, p: dict) -> None:
    if a["status"] == "reembolsada":
        return  # confirmação atrasada de um pagamento já estornado
    ate = acesso_ate(date.fromisoformat(p["dueDate"]))
    status = "ativa" if a["status"] in VIVAS else "cancelada"  # cancelada/encerrada: vale o período pago, sem renovar
    await con.execute(
        """update assinaturas set status = %s, pago_ate = greatest(coalesce(pago_ate, %s), %s),
             primeiro_pagamento_em = coalesce(primeiro_pagamento_em, now()), link_pagamento = null, atualizado_em = now()
           where id = %s""",
        (status, ate, ate, a["id"]),
    )
    await con.execute("update espacos set plano = %s where id = %s", (a["plano"], a["espaco_id"]))


# ---------- rotina do trabalhador ----------

async def encerrar_vencidas() -> int:
    """Quem passou do período pago (com a tolerância) volta ao Grátis."""
    vencidas = await db.todos(
        "select * from assinaturas where status in ('ativa','atrasada','cancelada') and pago_ate < now()")
    for a in vencidas:
        if a["status"] == "atrasada":
            try:  # não pagou nem na tolerância: para de gerar cobranças
                await _apagar_no_asaas(a["asaas_assinatura"])
            except ErroAsaas:
                log.warning("não deu para remover a assinatura %s no Asaas; tento de novo depois", a["asaas_assinatura"])
                continue
        if a["status"] != "ativa":  # ativa vencida = aviso de pagamento atrasado; um aviso novo devolve o acesso
            await db.executar("update assinaturas set status = 'encerrada', atualizado_em = now() where id = %s", (a["id"],))
        await db.executar(
            """update espacos set plano = 'gratis' where id = %s and plano <> 'gratis' and not exists (
                 select 1 from assinaturas where espaco_id = %s and status in ('ativa','atrasada','cancelada')
                 and pago_ate >= now())""",
            (a["espaco_id"], a["espaco_id"]),
        )
    return len(vencidas)
