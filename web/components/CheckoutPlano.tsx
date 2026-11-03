"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api, ErroApi } from "@/lib/api";
import type { PlanoDisponivel } from "@/lib/tipos";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";
import styles from "./CheckoutPlano.module.css";

type Pix = { imagem: string | null; copia_e_cola: string; expira_em: string | null };
type RespostaAssinatura = { pix?: Pix; situacao?: "processando" };
const CARTAO_VAZIO = { titular: "", numero: "", validade: "", cvv: "", cep: "", numero_endereco: "", telefone: "" };
// Pictogramas próprios do checkout: detalhes em amarelo e contornos em grafite.
const ICONES_BENEFICIOS = [
  <g key="garimpos">
    <circle cx="10" cy="10" r="7" fill="#fff5cf"/>
    <path d="m15.3 15.3 5.2 5.2" strokeWidth="2.4"/>
    <path d="m6.5 9 2-2.5h3L13.5 9 10 13Z" fill="#f3ce57" strokeLinejoin="round"/>
    <path d="M6.5 9h7M8.5 6.5 10 9l1.5-2.5M10 9v4" strokeWidth="1.1"/>
  </g>,
  <g key="resultados">
    <path d="M7 3.5h10a2 2 0 0 1 2 2V8M4 7h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" fill="#fff5cf"/>
    <path d="m7 11 4 3-4 3Z" fill="#f3ce57" strokeWidth="1.3"/>
    <circle cx="18" cy="17" r="4.5" fill="#f3ce57" stroke="#fff" strokeWidth="2"/>
    <path d="m15.8 17 1.5 1.5 2.8-3" strokeWidth="1.5"/>
  </g>,
  <g key="redes">
    <rect x="11" y="9" width="11" height="12" rx="3.4" fill="#fff5cf"/>
    <circle cx="16.5" cy="15" r="2.5"/>
    <circle cx="19.7" cy="11.8" r=".7" fill="currentColor" stroke="none"/>
    <path d="M9 2.5v10.1a3.2 3.2 0 1 1-2.4-3.1" strokeWidth="2"/>
    <path d="M9 2.5c.2 2 1.5 3.3 3.7 3.5" stroke="#d6a91e" strokeWidth="2.5"/>
  </g>,
  <g key="colecoes">
    <path d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5V10" fill="#fff5cf"/>
    <rect x="7" y="3" width="7" height="10" rx="1.5" transform="rotate(12 7 3)" fill="#fff"/>
    <path d="M3 10h17.5a1 1 0 0 1 1 1.2l-1.3 7.5a1.5 1.5 0 0 1-1.5 1.3H4.7a1.5 1.5 0 0 1-1.5-1.3l-1.1-7.5A1 1 0 0 1 3 10Z" fill="#f3ce57"/>
    <path d="M9 14h6" strokeWidth="1.5"/>
  </g>,
  <g key="conversa">
    <path d="M16 12v3.5a2 2 0 0 1-2 2H8l-4 3v-3H3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h8" fill="#fff5cf"/>
    <path d="m6 8.5 4 2.5-4 2.5Z" fill="#f3ce57" strokeWidth="1.3"/>
    <path d="m18 2 1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2Z" fill="#f3ce57" strokeWidth="1.3"/>
  </g>,
];
const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Bandeiras() {
  return <span className={styles.bandeiras} aria-label="Bandeiras de cartão">
    <span className={styles.visa}>VISA</span>
    <span className={styles.mastercard} aria-label="Mastercard"><i/><i/></span>
    <span className={styles.amex}>AMEX</span>
    <span className={styles.elo}>elo</span>
  </span>;
}

function CodigoSeguranca() {
  return <svg className={styles.codigoIcone} width="29" height="25" viewBox="0 0 29 25" fill="none" aria-hidden="true">
    <rect x="1" y="2" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 7h24" stroke="currentColor" strokeWidth="3"/>
    <rect x="9" y="13" width="20" height="12" rx="2" fill="#f7f7f7"/>
    <text x="12" y="22" fill="currentColor" fontSize="10" fontFamily="Arial,sans-serif">123</text>
  </svg>;
}

function PagarPix({ pix }: { pix: Pix }) {
  const [copiado, setCopiado] = useState(false);
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tempo.current) clearTimeout(tempo.current); }, []);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(pix.copia_e_cola);
      setCopiado(true);
      if (tempo.current) clearTimeout(tempo.current);
      tempo.current = setTimeout(() => setCopiado(false), 2500);
    } catch { setCopiado(false); }
  }
  return <div className={styles.pix}>
    {pix.imagem && <Image unoptimized src={`data:image/png;base64,${pix.imagem}`} alt="QR Code do Pix" width={220} height={220}/>}
    <p>Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.</p>
    <label className={styles.campo}><span className={styles.oculto}>Pix copia e cola</span><textarea readOnly value={pix.copia_e_cola} rows={3} onFocus={e => e.currentTarget.select()}/></label>
    <button type="button" className={styles.botaoSecundario} onClick={copiar}>{copiado ? "Copiado!" : "Copiar código Pix"}</button>
  </div>;
}

/** Mantém a confirmação pelo webhook e nunca armazena os dados do cartão. */
export function CheckoutPlano({ plano, planoAtual, disponivel, fechar }: {
  plano: PlanoDisponivel; planoAtual: string; disponivel: boolean; fechar: () => void;
}) {
  const { eu, recarregarEu, avisar } = useApp();
  const id = useId();
  const assinatura = eu?.assinatura;
  const [forma, setForma] = useState<"pix" | "cartao">(assinatura?.forma ?? "cartao");
  const [documento, setDocumento] = useState("");
  const [cartao, setCartao] = useState(CARTAO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [processando, setProcessando] = useState(false);
  const [demorou, setDemorou] = useState(false);
  const liberado = useRef(false);
  const viva = assinatura?.status === "ativa" || assinatura?.status === "atrasada";
  const atual = viva && planoAtual === plano.id;
  const gratis = plano.id === "gratis";
  const esperando = Boolean(pix) || processando;
  const pixPendente = assinatura?.status === "aguardando" && assinatura.plano === plano.id && assinatura.forma === "pix" && forma === "pix";
  const valor = moeda(plano.preco_mensal_centavos);
  const beneficios = [
    `${plano.garimpos} garimpos por mês`,
    plano.itens_completos === null ? "Todos os resultados completos" : `Até ${plano.itens_completos} resultados completos`,
    "Pesquisa no TikTok e Instagram",
    "Coleções para suas referências",
    "Converse sobre vídeos com a Cleo",
  ];

  useEffect(() => {
    if (!esperando) return;
    const conferir = setInterval(() => { recarregarEu(); }, 5000);
    const aviso = setTimeout(() => setDemorou(true), 120_000);
    const parar = setTimeout(() => clearInterval(conferir), 900_000);
    return () => { clearInterval(conferir); clearTimeout(aviso); clearTimeout(parar); };
  }, [esperando, recarregarEu]);

  useEffect(() => {
    if (!esperando || liberado.current || eu?.plano.id !== plano.id || eu?.assinatura?.status !== "ativa") return;
    liberado.current = true;
    avisar(`Pagamento confirmado: agora você está no plano ${plano.nome}.`);
    fechar();
  }, [esperando, eu, plano, avisar, fechar]);

  async function verPix() {
    if (enviando || !disponivel) return;
    setEnviando(true); setFalha(null);
    try { setPix((await api<{ pix: Pix }>("/api/assinatura/pix")).pix); }
    catch (erro) { setFalha(erro instanceof ErroApi ? erro.message : "Não deu para abrir o Pix. Tente de novo."); }
    setEnviando(false);
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (enviando || esperando || !disponivel || gratis || atual) return;
    setEnviando(true); setFalha(null);
    try {
      const resposta = await api<RespostaAssinatura>("/api/assinatura", {
        method: "POST", json: { plano: plano.id, forma, documento, ...(forma === "cartao" && !viva ? { cartao } : {}) },
      });
      if (resposta.pix) { setPix(resposta.pix); setEnviando(false); recarregarEu(); return; }
      if (resposta.situacao === "processando") { setCartao(CARTAO_VAZIO); setProcessando(true); setEnviando(false); recarregarEu(); return; }
      await recarregarEu(); avisar(`Pronto: agora você está no plano ${plano.nome}.`); fechar();
    } catch (erro) {
      setFalha(erro instanceof ErroApi ? erro.message : "Não deu para iniciar a assinatura. Tente de novo.");
      setEnviando(false);
    }
  }

  function campo(nome: keyof typeof CARTAO_VAZIO) {
    return { value: cartao[nome], onChange: (e: ChangeEvent<HTMLInputElement>) => {
      let valor = e.target.value;
      if (nome === "numero") valor = valor.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
      if (nome === "validade") valor = valor.replace(/\D/g, "").slice(0, 6).replace(/^(\d{2})(\d)/, "$1/$2");
      if (nome === "cvv") valor = valor.replace(/\D/g, "").slice(0, 4);
      setCartao(c => ({ ...c, [nome]: valor }));
    } };
  }

  return <form className={styles.checkout} onSubmit={enviar} aria-label={`Checkout do plano ${plano.nome}`}>
    <div className={styles.formulario}>
      {gratis || atual ? <section className={styles.estado}>
        <Icone nome="check" tamanho={28}/><h3>{atual ? "Você já tem este plano" : "Seu primeiro passo com a Cleo"}</h3>
        <p>{atual ? "Gerencie sua assinatura em Configurações → Plano e uso." : "Explore suas primeiras ideias com o plano Grátis, sem mensalidade."}</p>
      </section> : esperando ? <section className={styles.estado} aria-live="polite">
        <h3>{pix ? "Pague com Pix" : "Confirmando seu pagamento"}</h3>
        {pix && <PagarPix pix={pix}/>}
        <p role="status"><span className={styles.ponto}/>{pix ? "Aguardando o pagamento. Seu plano será liberado assim que o Pix for confirmado." : "Estamos aguardando a confirmação do seu cartão."}</p>
        {demorou && <p>A confirmação pode levar alguns minutos. Você pode fechar esta página: o plano será liberado assim que o pagamento for aprovado.</p>}
      </section> : pixPendente ? <section className={styles.estado}>
        <h3>Seu Pix está aguardando pagamento</h3><p>Abra o QR Code para concluir a assinatura do plano {plano.nome}.</p>
        <button type="button" className={styles.botaoSecundario} onClick={() => setForma("cartao")}>Prefiro pagar com cartão</button>
      </section> : viva ? <section className={styles.estado}>
        <h3>Trocar para o plano {plano.nome}</h3><p>A troca vale na hora e as próximas cobranças passam a ser de {valor} por mês, usando a forma de pagamento da sua assinatura.</p>
        <label className={styles.campo}><span className={styles.oculto}>CPF ou CNPJ</span><input value={documento} onChange={e => setDocumento(e.target.value)} inputMode="numeric" autoComplete="off" required minLength={11} maxLength={20} placeholder="Confirme seu CPF ou CNPJ" disabled={enviando}/></label>
      </section> : <>
        <fieldset className={styles.pagamento} disabled={enviando}>
          <legend>Forma de pagamento</legend>
          <div className={styles.metodos} role="group" aria-label="Forma de pagamento">
            <button type="button" aria-pressed={forma === "cartao"} onClick={() => { setForma("cartao"); setFalha(null); }}><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="4.5" width="20" height="15" rx="3" fill="#fff5cf"/><path d="M2 9h20" strokeWidth="2.5"/><path d="M6 15h4M16 15h2" strokeLinecap="round"/></svg><span>Cartão de crédito</span><span className={styles.selecaoMetodo} aria-hidden="true"><Icone nome="check" tamanho={11} traco={2.5}/></span></button>
            <button type="button" aria-pressed={forma === "pix"} onClick={() => { setForma("pix"); setFalha(null); }}><svg className={styles.iconePix} width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m10.6 2.1-4 4h2.2c.7 0 1.4.3 1.9.8L12 8.2l1.3-1.3c.5-.5 1.2-.8 1.9-.8h2.2l-4-4a2 2 0 0 0-2.8 0ZM2.1 10.6l3-3h3.7c.3 0 .6.1.8.3l1.4 1.4a1.4 1.4 0 0 0 2 0l1.4-1.4c.2-.2.5-.3.8-.3h3.7l3 3a2 2 0 0 1 0 2.8l-3 3h-3.7c-.3 0-.6-.1-.8-.3L13 14.7a1.4 1.4 0 0 0-2 0l-1.4 1.4c-.2.2-.5.3-.8.3H5.1l-3-3a2 2 0 0 1 0-2.8ZM6.6 17.9l4 4a2 2 0 0 0 2.8 0l4-4h-2.2c-.7 0-1.4-.3-1.9-.8L12 15.8l-1.3 1.3c-.5.5-1.2.8-1.9.8H6.6Z"/></svg><span>Pix</span><span className={styles.selecaoMetodo} aria-hidden="true"><Icone nome="check" tamanho={11} traco={2.5}/></span></button>
          </div>
          {forma === "cartao" ? <div className={styles.campos}>
            <label className={`${styles.campo} ${styles.numeroCartao}`}><span className={styles.oculto}>Número do cartão</span><input {...campo("numero")} name="cardnumber" autoComplete="cc-number" inputMode="numeric" required maxLength={23} placeholder="Número do cartão"/><Bandeiras/></label>
            <div className={styles.linha}>
              <label className={styles.campo}><span className={styles.oculto}>Data de validade</span><input {...campo("validade")} name="expiry" autoComplete="cc-exp" inputMode="numeric" required maxLength={7} placeholder="Validade (MM/AA)"/></label>
              <label className={`${styles.campo} ${styles.codigo}`}><span className={styles.oculto}>Código de segurança</span><input {...campo("cvv")} name="cvc" autoComplete="cc-csc" inputMode="numeric" type="password" required maxLength={4} placeholder="Código de segurança"/><CodigoSeguranca/></label>
            </div>
          </div> : <p className={styles.infoPix}><Icone nome="cadeado" tamanho={18}/>Ao continuar, você recebe um QR Code para pagar com o app do seu banco.</p>}
        </fieldset>
        <fieldset className={styles.cobranca} disabled={enviando}>
          <legend>Dados de cobrança</legend>
          <div className={styles.campos}>
            {forma === "cartao" && <label className={styles.campo}><span className={styles.oculto}>Nome completo do titular</span><input {...campo("titular")} name="cardholder" autoComplete="cc-name" required maxLength={100} placeholder="Nome completo do titular"/></label>}
            <div className={styles.pais}><span>País ou região</span><b>Brasil</b><Icone nome="baixo" tamanho={17}/></div>
            <label className={styles.campo}><span className={styles.oculto}>CPF ou CNPJ</span><input name="documento" value={documento} onChange={e => setDocumento(e.target.value)} inputMode="numeric" autoComplete="off" required minLength={11} maxLength={20} placeholder="CPF ou CNPJ"/></label>
            {forma === "cartao" && <>
              <div className={styles.linhaEndereco}>
                <label className={styles.campo}><span className={styles.oculto}>CEP</span><input {...campo("cep")} name="postal-code" autoComplete="postal-code" inputMode="numeric" required maxLength={9} placeholder="CEP"/></label>
                <label className={styles.campo}><span className={styles.oculto}>Número do endereço</span><input {...campo("numero_endereco")} name="address-number" autoComplete="off" required maxLength={20} placeholder="Número do endereço"/></label>
              </div>
              <label className={styles.campo}><span className={styles.oculto}>Celular com DDD</span><input {...campo("telefone")} name="phone" autoComplete="tel-national" inputMode="tel" required maxLength={20} placeholder="Celular com DDD"/></label>
            </>}
          </div>
        </fieldset>
      </>}
    </div>
    <aside className={styles.colunaResumo} aria-label="Resumo da assinatura">
      <div className={styles.resumo}>
        <h3>Plano {plano.nome}</h3>
        <h4>Principais benefícios</h4>
        <ul>{beneficios.map((beneficio, indice) => <li key={beneficio}><svg className={styles.iconeBeneficio} width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES_BENEFICIOS[indice]}</svg><span>{beneficio}</span></li>)}</ul>
        <dl className={styles.valores}>
          <div><dt>Assinatura mensal</dt><dd>{valor}</dd></div>
          <div className={styles.total}><dt>{atual ? "Seu plano atual" : viva ? "Próxima mensalidade" : "Total hoje"}</dt><dd>{valor}</dd></div>
        </dl>
        {falha && <p className={styles.falha} role="alert">{falha}</p>}
        {gratis || atual ? <button type="button" className={styles.assinar} onClick={fechar}>Continuar com meu plano</button>
          : esperando ? <button type="button" className={styles.assinar} onClick={fechar}>Voltar para a Cleo</button>
          : pixPendente ? <button type="button" className={styles.assinar} onClick={verPix} disabled={enviando || !disponivel}>{enviando ? "Abrindo o Pix…" : "Ver o Pix"}</button>
          : <button type="submit" className={styles.assinar} disabled={enviando || !disponivel} aria-describedby={!disponivel ? `${id}-indisponivel` : undefined}>{enviando ? "Processando…" : viva ? `Trocar para o ${plano.nome}` : forma === "pix" ? "Gerar Pix e assinar" : "Assinar"}</button>}
        {!disponivel && !gratis && !atual && <p id={`${id}-indisponivel`} className={styles.indisponivel}>As assinaturas estarão disponíveis em breve.</p>}
      </div>
      {!gratis && <p className={styles.termos}>
        {forma === "cartao" ? `Renovação mensal de ${valor} até o cancelamento.` : `Todo mês, um novo Pix de ${valor} é enviado por e-mail.`} Cancele a qualquer momento em Configurações. O pagamento é processado pelo Asaas. Reembolso integral nos primeiros 7 dias.
      </p>}
    </aside>
  </form>;
}
