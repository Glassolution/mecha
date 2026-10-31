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

/** Leva à fatura do Asaas. O plano só muda quando o Asaas confirma o pagamento (aviso para a API). */
function Assinar({plano,planoAtual,fechar}:{plano:PlanoDisponivel;planoAtual:string;fechar:()=>void}) {
  const {eu,recarregarEu,avisar} = useApp();
  const assinatura = eu?.assinatura;
  const [forma,setForma] = useState<"pix"|"cartao">("pix");
  const [documento,setDocumento] = useState("");
  const [enviando,setEnviando] = useState(false);
  const [falha,setFalha] = useState<string|null>(null);
  const viva = assinatura && (assinatura.status === "ativa" || assinatura.status === "atrasada");

  if (plano.id === "gratis") return <button type="button" className={styles.acao} onClick={fechar}>Entendi</button>;
  if (viva && planoAtual === plano.id) return <><p className={styles.aviso}>Este já é o seu plano. Para cancelar ou pedir reembolso, abra Configurações → Plano e uso.</p><button type="button" className={styles.acao} onClick={fechar}>Entendi</button></>;
  if (assinatura?.status === "aguardando" && assinatura.plano === plano.id && assinatura.link_pagamento) {
    return <div className={styles.assinar}><p className={styles.aviso}>Seu pedido está aguardando o pagamento. Assim que ele for confirmado, o plano {plano.nome} é liberado.</p><a className={styles.acao} href={assinatura.link_pagamento}>Continuar pagamento</a></div>;
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setEnviando(true);setFalha(null);
    try {
      const r = await api<{url:string|null}>("/api/assinatura",{method:"POST",json:{plano:plano.id,forma,documento}});
      if (r.url) {location.href = r.url;return;}
      await recarregarEu();avisar(`Pronto: agora você está no plano ${plano.nome}.`);fechar();
    } catch (erro) {
      setFalha(erro instanceof ErroApi ? erro.message : "Não deu para iniciar a assinatura. Tente de novo.");
      setEnviando(false);
    }
  }

  return <form className={styles.assinar} onSubmit={enviar}>
    {viva && <p className={styles.aviso}>Você vai trocar do seu plano atual para o {plano.nome}. A troca vale na hora e as próximas cobranças passam a ser de {(plano.preco_mensal_centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}.</p>}
    {!viva && <>
      <fieldset className={styles.formas}><legend>Como você quer pagar?</legend>
        <label><input type="radio" name="forma" value="pix" checked={forma==="pix"} onChange={()=>setForma("pix")}/>Pix</label>
        <label><input type="radio" name="forma" value="cartao" checked={forma==="cartao"} onChange={()=>setForma("cartao")}/>Cartão de crédito</label>
      </fieldset>
      <label className={styles.campo}><span>CPF ou CNPJ</span><input value={documento} onChange={e=>setDocumento(e.target.value)} inputMode="numeric" autoComplete="off" required minLength={11} maxLength={20} placeholder="000.000.000-00"/><small>Pedido pelo Asaas para emitir a cobrança.</small></label>
    </>}
    {falha && <p className={styles.falha} role="alert">{falha}</p>}
    <button type="submit" className={styles.acao} disabled={enviando}>{enviando ? "Abrindo o pagamento…" : viva ? `Trocar para o ${plano.nome}` : `Assinar o ${plano.nome}`}</button>
    {!viva && <p className={styles.aviso}>{forma === "cartao" ? "A cobrança no cartão se repete todo mês." : "Todo mês chega um Pix novo por e-mail."} O pagamento é feito na página segura do Asaas, e você pode cancelar quando quiser. Nos primeiros 7 dias, o reembolso é integral.</p>}
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
        <footer className={styles.rodape}><span><Icone nome="cadeado" tamanho={13}/>Ver os planos não altera sua conta.</span><p>{dados.contratacao_disponivel ? "Pagamento por Pix ou cartão, pelo Asaas." : "Assinaturas disponíveis em breve."}</p></footer>
      </>}
    </div>
  </dialog>;
}
