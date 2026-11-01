"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, ErroApi, useApi } from "@/lib/api";
import type { CatalogoPlanos, PlanoDisponivel } from "@/lib/tipos";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";
import { Logo } from "./Logo";
import { Pose } from "./Pose";
import styles from "./ModalPlanos.module.css";

const DESCRICOES = {
  gratis: "Para descobrir suas primeiras oportunidades.",
  pro: "Para explorar mais e dar forma às suas ideias.",
  agencia: "Para quem pesquisa e cria em maior volume.",
};

function beneficios(plano: PlanoDisponivel) {
  return [
    `${plano.garimpos} garimpos por mês`,
    plano.itens_completos === null ? "Todos os resultados completos" : `Até ${plano.itens_completos} resultados completos`,
    "Pesquisa no TikTok e Instagram",
    "Coleções para suas referências",
    "Converse sobre vídeos com a Wae",
  ];
}

function Preco({centavos}:{centavos:number}) {
  const [inteiro,decimal] = (centavos / 100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).split(",");
  return <div className={styles.preco}><b>R$ {inteiro}<span>,{decimal}</span></b><small>/mês</small></div>;
}

type Pix = {imagem:string|null;copia_e_cola:string;expira_em:string|null};
type RespostaAssinatura = {forma?:"pix"|"cartao";pix?:Pix;situacao?:"processando";url?:null;plano?:string};
const CARTAO_VAZIO = {titular:"",numero:"",validade:"",cvv:"",cep:"",numero_endereco:"",telefone:""};

/** Mostra o QR Code e o copia e cola, e espera o aviso do Asaas. */
function PagarPix({pix}:{pix:Pix}) {
  const [copiado,setCopiado] = useState(false);
  async function copiar() {
    try {await navigator.clipboard.writeText(pix.copia_e_cola);setCopiado(true);setTimeout(()=>setCopiado(false),2500);} catch {}
  }
  return <div className={styles.pix}>
    {pix.imagem && <img src={`data:image/png;base64,${pix.imagem}`} alt="QR Code do Pix" width={220} height={220}/>}
    <p className={styles.aviso}>Abra o app do seu banco, escolha pagar com Pix e leia o QR Code, ou use o copia e cola.</p>
    <label className={styles.campo}><span>Pix copia e cola</span><textarea readOnly value={pix.copia_e_cola} rows={3} onFocus={e=>e.currentTarget.select()}/></label>
    <button type="button" className={styles.acao} onClick={copiar}>{copiado ? "Copiado!" : "Copiar código"}</button>
  </div>;
}

/** Pagamento sem sair do site (checkout transparente). O plano só muda quando o Asaas confirma o pagamento (aviso para a API). */
function Assinar({plano,planoAtual,fechar}:{plano:PlanoDisponivel;planoAtual:string;fechar:()=>void}) {
  const {eu,recarregarEu,avisar} = useApp();
  const assinatura = eu?.assinatura;
  const [forma,setForma] = useState<"pix"|"cartao">("pix");
  const [documento,setDocumento] = useState("");
  const [cartao,setCartao] = useState(CARTAO_VAZIO);
  const [enviando,setEnviando] = useState(false);
  const [falha,setFalha] = useState<string|null>(null);
  const [pix,setPix] = useState<Pix|null>(null);
  const [processando,setProcessando] = useState(false);
  const [demorou,setDemorou] = useState(false);
  const viva = assinatura && (assinatura.status === "ativa" || assinatura.status === "atrasada");
  const esperando = Boolean(pix) || processando;
  const liberado = useRef(false);

  // enquanto espera o pagamento, confere de 5 em 5 segundos se o aviso do Asaas já chegou
  useEffect(() => {
    if (!esperando) return;
    const conferir = setInterval(() => {recarregarEu();},5000);
    const aviso = setTimeout(() => setDemorou(true),120_000);
    const parar = setTimeout(() => clearInterval(conferir),900_000);
    return () => {clearInterval(conferir);clearTimeout(aviso);clearTimeout(parar);};
  },[esperando,recarregarEu]);

  useEffect(() => {
    if (!esperando || liberado.current || eu?.plano.id !== plano.id || eu?.assinatura?.status !== "ativa") return;
    liberado.current = true;
    avisar(`Pagamento confirmado: agora você está no plano ${plano.nome}.`);fechar();
  },[esperando,eu,plano,avisar,fechar]);

  if (plano.id === "gratis") return <button type="button" className={styles.acao} onClick={fechar}>Entendi</button>;
  if (viva && planoAtual === plano.id && !esperando) return <><p className={styles.aviso}>Este já é o seu plano. Para cancelar ou pedir reembolso, abra Configurações → Plano e uso.</p><button type="button" className={styles.acao} onClick={fechar}>Entendi</button></>;

  if (pix) return <div className={styles.assinar}>
    <PagarPix pix={pix}/>
    <p className={styles.esperando} role="status"><span className={styles.ponto} aria-hidden="true"/>Aguardando o pagamento. Assim que o Pix cair, o plano {plano.nome} é liberado aqui mesmo.</p>
    {demorou && <p className={styles.aviso}>Já pagou? A confirmação pode levar alguns minutos. Você pode fechar esta janela: o plano é liberado sozinho.</p>}
  </div>;
  if (processando) return <div className={styles.assinar}>
    <p className={styles.esperando} role="status"><span className={styles.ponto} aria-hidden="true"/>Confirmando o pagamento no cartão…</p>
    {demorou && <p className={styles.aviso}>O banco está levando mais tempo para confirmar. Você pode fechar esta janela: o plano é liberado assim que o pagamento for aprovado.</p>}
  </div>;

  async function verPix() {
    setEnviando(true);setFalha(null);
    try {setPix((await api<{pix:Pix}>("/api/assinatura/pix")).pix);}
    catch (erro) {setFalha(erro instanceof ErroApi ? erro.message : "Não deu para abrir o Pix. Tente de novo.");}
    setEnviando(false);
  }

  if (assinatura?.status === "aguardando" && assinatura.plano === plano.id && assinatura.forma === "pix" && forma === "pix") {
    return <div className={styles.assinar}><p className={styles.aviso}>Seu Pix está aguardando o pagamento. Assim que ele for confirmado, o plano {plano.nome} é liberado.</p>
      {falha && <p className={styles.falha} role="alert">{falha}</p>}
      <button type="button" className={styles.acao} onClick={verPix} disabled={enviando}>{enviando ? "Abrindo o Pix…" : "Ver o Pix"}</button>
      <button type="button" className={styles.trocarForma} onClick={()=>setForma("cartao")}>Prefiro pagar com cartão</button>
    </div>;
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setEnviando(true);setFalha(null);
    try {
      const r = await api<RespostaAssinatura>("/api/assinatura",{method:"POST",json:{plano:plano.id,forma,documento,...(forma==="cartao" && !viva ? {cartao} : {})}});
      if (r.pix) {setPix(r.pix);setEnviando(false);recarregarEu();return;}
      if (r.situacao === "processando") {setCartao(CARTAO_VAZIO);setProcessando(true);setEnviando(false);recarregarEu();return;}
      await recarregarEu();avisar(`Pronto: agora você está no plano ${plano.nome}.`);fechar();
    } catch (erro) {
      setFalha(erro instanceof ErroApi ? erro.message : "Não deu para iniciar a assinatura. Tente de novo.");
      setEnviando(false);
    }
  }

  const campo = (nome: keyof typeof CARTAO_VAZIO) => ({value:cartao[nome],onChange:(e:React.ChangeEvent<HTMLInputElement>)=>setCartao(c=>({...c,[nome]:e.target.value}))});

  return <form className={styles.assinar} onSubmit={enviar}>
    {viva && <p className={styles.aviso}>Você vai trocar do seu plano atual para o {plano.nome}. A troca vale na hora e as próximas cobranças passam a ser de {(plano.preco_mensal_centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}.</p>}
    {!viva && <>
      <fieldset className={styles.formas}><legend>Como você quer pagar?</legend>
        <label><input type="radio" name="forma" value="pix" checked={forma==="pix"} onChange={()=>setForma("pix")}/>Pix</label>
        <label><input type="radio" name="forma" value="cartao" checked={forma==="cartao"} onChange={()=>setForma("cartao")}/>Cartão de crédito</label>
      </fieldset>
      <label className={styles.campo}><span>CPF ou CNPJ</span><input value={documento} onChange={e=>setDocumento(e.target.value)} inputMode="numeric" autoComplete="off" required minLength={11} maxLength={20} placeholder="000.000.000-00"/><small>Pedido pelo Asaas para emitir a cobrança.</small></label>
      {forma === "cartao" && <fieldset className={styles.cartao}><legend>Dados do cartão</legend>
        <label className={styles.campo}><span>Nome impresso no cartão</span><input {...campo("titular")} autoComplete="cc-name" required maxLength={100}/></label>
        <label className={styles.campo}><span>Número do cartão</span><input {...campo("numero")} autoComplete="cc-number" inputMode="numeric" required maxLength={23} placeholder="0000 0000 0000 0000"/></label>
        <div className={styles.linha}>
          <label className={styles.campo}><span>Validade</span><input {...campo("validade")} autoComplete="cc-exp" inputMode="numeric" required maxLength={7} placeholder="MM/AA"/></label>
          <label className={styles.campo}><span>CVV</span><input {...campo("cvv")} autoComplete="cc-csc" inputMode="numeric" required maxLength={4} placeholder="123"/></label>
        </div>
        <div className={styles.linha}>
          <label className={styles.campo}><span>CEP</span><input {...campo("cep")} autoComplete="postal-code" inputMode="numeric" required maxLength={9} placeholder="00000-000"/></label>
          <label className={styles.campo}><span>Nº do endereço</span><input {...campo("numero_endereco")} autoComplete="off" required maxLength={20} placeholder="123"/></label>
        </div>
        <label className={styles.campo}><span>Celular com DDD</span><input {...campo("telefone")} autoComplete="tel-national" inputMode="tel" required maxLength={20} placeholder="(11) 90000-0000"/><small>O Asaas usa o endereço e o telefone do titular para aprovar a compra com segurança.</small></label>
      </fieldset>}
    </>}
    {falha && <p className={styles.falha} role="alert">{falha}</p>}
    <button type="submit" className={styles.acao} disabled={enviando}>{enviando ? (forma === "cartao" && !viva ? "Processando o pagamento…" : "Gerando o Pix…") : viva ? `Trocar para o ${plano.nome}` : forma === "cartao" ? `Pagar e assinar o ${plano.nome}` : `Gerar Pix do ${plano.nome}`}</button>
    {!viva && <p className={styles.aviso}><Icone nome="cadeado" tamanho={13}/> {forma === "cartao" ? "A cobrança no cartão se repete todo mês. Os dados do cartão vão direto para o Asaas e não ficam guardados com a gente." : "Todo mês chega um Pix novo por e-mail."} Você pode cancelar quando quiser. Nos primeiros 7 dias, o reembolso é integral.</p>}
  </form>;
}

export function ModalPlanos({planoAtual,fechar}:{planoAtual:string;fechar:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const {dados,erro,recarregar} = useApi<CatalogoPlanos>("/api/planos");
  const [selecionado,setSelecionado] = useState<PlanoDisponivel | null>(null);

  useEffect(() => {
    const janela = ref.current;
    const focoAnterior = document.activeElement;
    if (janela && !janela.open) janela.showModal();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      janela?.close();document.body.style.overflow = overflowAnterior;
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected && getComputedStyle(focoAnterior).visibility !== "hidden") focoAnterior.focus({preventScroll:true});
      else document.querySelector<HTMLButtonElement>(".sidebar-abrir")?.focus({preventScroll:true});
    };
  },[]);

  useEffect(() => {titulo.current?.focus({preventScroll:true});if (ref.current) ref.current.scrollTop = 0;},[selecionado]);

  const gratuito = dados?.itens.find(p => p.id === "gratis");

  return <dialog ref={ref} className={styles.janela} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-descricao`} onCancel={e=>{e.preventDefault();fechar();}} onClick={e=>{if (e.target === e.currentTarget) fechar();}}>
    <div className={styles.interior}>
      <header className={styles.topo}>
        <div>{selecionado && <button type="button" className={styles.voltar} onClick={()=>setSelecionado(null)} aria-label="Voltar aos planos"><Icone nome="voltar" tamanho={24}/></button>}<Logo tamanho={26} triangulo/></div>
        <button type="button" className={styles.fechar} aria-label="Fechar planos" onClick={fechar}><Icone nome="x" tamanho={24}/></button>
      </header>
      <div className={styles.cabecalho}>
        <div><h2 id={`${id}-titulo`} ref={titulo} tabIndex={-1}>{selecionado ? `Conheça o plano ${selecionado.nome}` : "Qual plano combina com você?"}</h2><p id={`${id}-descricao`}>{selecionado ? DESCRICOES[selecionado.id] : "Do primeiro garimpo ao próximo grande projeto."}</p></div>
        <span className={styles.periodo}>Planos mensais</span>
      </div>
      {erro ? <div className={styles.erro} role="alert"><p>Não foi possível carregar os planos.</p><button type="button" onClick={recarregar}>Tentar novamente</button></div> : !dados ? <div className={styles.grade} role="status" aria-label="Carregando planos">{[0,1].map(n=><div className={`${styles.esqueleto} esqueleto`} key={n}/>)}</div> : selecionado ? <div className={styles.detalhes}>
        <div className={styles.resumo}><span className={styles.icone}><Icone nome={selecionado.id === "agencia" ? "maleta" : selecionado.id === "pro" ? "estudio" : "broto"} tamanho={25}/></span><h3>{selecionado.nome}</h3><Preco centavos={selecionado.preco_mensal_centavos}/><p>{selecionado.id === "gratis" ? "Sem mensalidade." : "Valor mensal do plano."}</p></div>
        <div className={styles.detalhesCorpo}><h3>O que está incluído</h3><ul>{beneficios(selecionado).map(b=><li key={b}><Icone nome="check" tamanho={15}/><span>{b}</span></li>)}</ul>{dados.contratacao_disponivel ? <Assinar plano={selecionado} planoAtual={planoAtual} fechar={fechar}/> : <><p className={styles.emBreve}>As assinaturas estarão disponíveis em breve. Por enquanto, você pode comparar os planos sem alterar sua conta.</p><button type="button" className={styles.acao} onClick={fechar}>Entendi</button></>}</div>
      </div> : <>
        <div className={styles.molduraPlanos}><div className={styles.grade}>{dados.itens.filter(p => p.id !== "gratis").map(plano => {
          const atual = plano.id === planoAtual;
          return <div key={plano.id} className={styles.planoEnvelope} data-plano={plano.id}>
            <span className={styles.faixaPlano} aria-hidden="true">{plano.id === "pro" ? "Para suas próximas ideias" : "Para criar em maior volume"}</span>
            <article className={styles.plano} aria-label={`Plano ${plano.nome}`}>
            <span className={styles.cantos} aria-hidden="true"/>
            <div className={styles.planoTopo}><h3>{plano.nome}</h3>{atual && <span className={styles.selo}>Seu plano</span>}</div>
            <Preco centavos={plano.preco_mensal_centavos}/>
            <div className={styles.incluido}><h4 className="oculto">O que está incluído</h4><ul>{beneficios(plano).map(b=><li key={b}><span className={styles.marcador} aria-hidden="true">✣</span><span>{b}</span></li>)}</ul></div>
            <p className={styles.descricaoPlano}>{DESCRICOES[plano.id]}</p>
            <div className={styles.planoRodape}><button type="button" className={styles.acao} aria-label={`Ver detalhes do plano ${plano.nome}`} onClick={()=>setSelecionado(plano)}>Ver detalhes<span className={styles.setaAcao} aria-hidden="true"><Icone nome="direita" tamanho={13}/></span></button><div className={styles.ilustracao} aria-hidden="true"><span/><Pose nome={plano.id === "pro" ? "acenando" : "pesquisando"} cor={plano.id === "pro" ? "amarelo" : "lilas"} largura={94}/></div></div>
          </article></div>;
        })}</div></div>
        {gratuito && <article className={styles.gratuito} aria-label="Plano Grátis"><div className={styles.gratuitoCorpo}><div className={styles.gratuitoTitulo}><h3>Comece com o Grátis</h3>{planoAtual === "gratis" && <span className={styles.selo}>Seu plano</span>}</div><p>Seu primeiro passo para encontrar boas ideias.</p><span className={styles.gratuitoLimites}>{gratuito.garimpos} garimpos por mês · Até {gratuito.itens_completos} resultados completos · Sem mensalidade</span><button type="button" className={styles.acao} aria-label="Ver detalhes do plano Grátis" onClick={()=>setSelecionado(gratuito)}>Ver detalhes</button></div><div className={styles.ilustracaoGratuito} aria-hidden="true"><span/><Pose nome="andando" cor="menta" largura={115}/></div></article>}
        <footer className={styles.rodape}><span><Icone nome="cadeado" tamanho={13}/>Ver os planos não altera sua conta.</span><p>{dados.contratacao_disponivel ? "Pagamento por Pix ou cartão, aqui mesmo, processado pelo Asaas." : "Assinaturas disponíveis em breve."}</p></footer>
      </>}
    </div>
  </dialog>;
}
