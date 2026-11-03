"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, limparCache } from "@/lib/api";
import { destinoSeguro } from "@/lib/auth";
import { AVATARES, CORES_PERFIL, avatarValido, corPerfil, corDaPersonagem, estiloTema, type AvatarId, type CorPerfilId, type CorPersonagemId } from "@/lib/identidade";
import { TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/perfil";
import type { Eu } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { Logo } from "@/components/Logo";
import { Pose } from "@/components/Pose";
import { IconeBru } from "@/components/IconeBru";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import { LogoSite, dominio } from "@/components/LogoSite";
import styles from "./cadastro.module.css";

type Perfil = NonNullable<Eu["espaco"]["perfil"]>;
type Objetivo = NonNullable<Eu["espaco"]["objetivo"]>;
const ETAPAS = ["Você", "Sua Cleo", "Seu objetivo", "Seu projeto"];
const ULTIMA_ETAPA = ETAPAS.length - 1;
const PERFIS: {id: Perfil; nome: string; icone: string}[] = [{id:"founder",nome:"Founder",icone:"foguete"},{id:"empresario",nome:"Empresário",icone:"maleta"},{id:"investidor",nome:"Investidor",icone:"grafico"},{id:"passeando",nome:"Explorando",icone:"bussola"}];
const OBJETIVOS: {id: Objetivo; nome: string; descricao: string; icone: string}[] = [{id:"ideias",nome:"Encontrar ideias de negócio",descricao:"Descobrir problemas e oportunidades para construir.",icone:"ideia"},{id:"criativos",nome:"Encontrar criativos",descricao:"Entender formatos e ganchos para divulgar meu negócio.",icone:"claquete"},{id:"os_dois",nome:"Um pouco dos dois",descricao:"Quero explorar ideias e conteúdos que funcionam.",icone:"estudio"}];
const HANDLE = /^[a-z0-9_]{3,30}$/;
function sugerirIdentificador(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,30); }
function telefoneValido(valor: string) { return !valor.trim() || (/^\+?[\d\s().-]+$/.test(valor.trim()) && valor.replace(/\D/g,"").length >= 8 && valor.replace(/\D/g,"").length <= 15); }

export function Quiz({ eu }: { eu: Eu }) {
  const sp = useSearchParams();
  const proximo = destinoSeguro(sp.get("proximo"));
  const destino = proximo.startsWith("/boas-vindas") ? "/inicio" : proximo;
  const [boasVindas, setBoasVindas] = useState(sp.get("editar") !== "1");
  const editando = sp.get("editar") === "1";
  const [etapa, setEtapa] = useState(editando && sp.get("etapa") === "2" ? 1 : 0);
  const parteEmail = eu.conta.email.split("@")[0];
  const [nome, setNome] = useState(eu.conta.nome ?? "");
  const [identificador, setIdentificador] = useState(eu.conta.identificador ?? sugerirIdentificador(parteEmail));
  const [bio, setBio] = useState(eu.conta.bio ?? "");
  const [whatsapp, setWhatsapp] = useState(eu.conta.whatsapp ?? "");
  const [avatar, setAvatar] = useState<AvatarId>(avatarValido(eu.conta.avatar));
  const [corPersonagem, setCorPersonagem] = useState<CorPersonagemId>(corDaPersonagem(eu.conta.cor_personagem).id);
  const [cor, setCor] = useState<CorPerfilId>(corPerfil(eu.conta.cor_perfil).id);
  const [perfil, setPerfil] = useState<Perfil | null>(eu.espaco.perfil);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(eu.espaco.objetivo);
  const [temProjeto, setTemProjeto] = useState(!!eu.meu_saas);
  const [projeto, setProjeto] = useState({tipo:eu.meu_saas?.tipo ?? null,nome:eu.meu_saas?.nome ?? "",link:eu.meu_saas?.link ?? "",o_que_faz:eu.meu_saas?.o_que_faz ?? ""});
  const [disponivel, setDisponivel] = useState<"livre"|"consultando"|"sim"|"nao"|"erro">("livre");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const trava = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const handleValido = HANDLE.test(identificador);
  const corAtual = corPerfil(cor);

  useEffect(() => {
    if (boasVindas || !handleValido || identificador === eu.conta.identificador) return;
    let vivo = true;
    const tempo = setTimeout(() => {
      setDisponivel("consultando");
      api<{disponivel:boolean}>(`/api/conta/identificador?valor=${encodeURIComponent(identificador)}`)
        .then(r => {if (vivo) setDisponivel(r.disponivel ? "sim" : "nao");})
        .catch(() => {if (vivo) setDisponivel("erro");});
    },400);
    return () => {vivo=false;clearTimeout(tempo);};
  },[identificador, handleValido, boasVindas, eu.conta.identificador]);

  useEffect(() => {if (!boasVindas) {tituloRef.current?.focus({preventScroll:true});window.scrollTo({top:0,left:0,behavior:"instant"});}},[etapa,boasVindas]);

  function ir(etapaNova: number) { setErro(null);setEtapa(etapaNova); }
  async function verificarIdentidade(pular = false) {
    if (!pular && (!nome.trim() || !handleValido)) {setEtapa(0);setErro("Preencha seu nome e um identificador de 3 a 30 letras, números ou sublinhado.");return false;}
    if (!telefoneValido(whatsapp)) {setEtapa(0);setErro("Confira o WhatsApp. Use o código do país e o DDD, por exemplo: +55 (11) 98765-4321.");return false;}
    if (handleValido && identificador !== eu.conta.identificador) {
      try {const r = await api<{disponivel:boolean}>(`/api/conta/identificador?valor=${encodeURIComponent(identificador)}`);if (!r.disponivel) {setDisponivel("nao");setEtapa(0);setErro("Esse identificador já está em uso. Escolha outro.");return false;}}
      catch (e) {setErro((e as Error).message);return false;}
    }
    return true;
  }
  async function avancar(e?: FormEvent) {
    e?.preventDefault();if (trava.current) return;
    if (etapa === 0) {trava.current=true;setSalvando(true);const ok = await verificarIdentidade();trava.current=false;setSalvando(false);if (!ok) return;}
    if (etapa === ULTIMA_ETAPA) {await concluir();return;}
    ir(etapa+1);
  }
  async function concluir(pular = false) {
    if (trava.current) return;
    trava.current=true;setSalvando(true);setErro(null);
    try {
      if (!await verificarIdentidade(pular)) return;
      if (!pular && temProjeto && !projeto.nome.trim()) {setEtapa(3);setErro("Dê um nome ao seu projeto para continuar.");return;}
      await api("/api/conta", {method:"PATCH",json:{nome:nome.trim() || undefined,identificador:handleValido ? identificador : undefined,bio:bio.trim() || null,whatsapp:whatsapp.trim() || null,avatar,cor_perfil:cor,cor_personagem:corPersonagem}});
      if (temProjeto && projeto.nome.trim()) await api("/api/meu-saas", {method:"PUT",json:{nome:projeto.nome.trim(),tipo:projeto.tipo,link:projeto.link.trim() || null,o_que_faz:projeto.o_que_faz.trim() || null}});
      const primeiro = nome.trim().split(/\s+/)[0];
      await api("/api/espaco", {method:"PATCH",json:{nome:temProjeto && projeto.nome.trim() ? projeto.nome.trim() : primeiro ? `Espaço de ${primeiro}` : undefined,perfil:perfil ?? undefined,objetivo:objetivo ?? undefined,boas_vindas_ok:true}});
      limparCache("/api/eu");location.assign(destino);
    } catch (e) {setErro((e as Error).message);}
    finally {trava.current=false;setSalvando(false);}
  }
  async function salvarAparencia() {
    if (trava.current) return;
    trava.current=true;setSalvando(true);setErro(null);
    try {
      await api("/api/conta", {method:"PATCH",json:{avatar,cor_perfil:cor,cor_personagem:corPersonagem}});
      limparCache("/api/eu");location.assign(destino);
    } catch (e) {setErro((e as Error).message);}
    finally {trava.current=false;setSalvando(false);}
  }
  const avancarDesabilitado = salvando || (etapa === 0 && (!nome.trim() || !handleValido || disponivel === "nao" || !telefoneValido(whatsapp))) || (etapa === 2 && !objetivo) || (etapa === 3 && temProjeto && !projeto.nome.trim());
  const atual = ETAPAS[etapa];

  return <main className={styles.pagina} style={{...estiloTema(cor,corPersonagem),"--cor-cartao":corAtual.cor} as CSSProperties}>
    <header className={styles.topo}><Link href="/inicio" className={boasVindas ? styles.marcaOculta : styles.marca} aria-label="Cleo, início"><Logo tamanho={22} triangulo/></Link><span className={styles.etapaAtual}>{boasVindas ? "Você" : atual} · {etapa+1} de {ETAPAS.length}</span>{!boasVindas && <button className={styles.pular} onClick={() => concluir(true)} disabled={salvando}>{salvando ? "Aguarde…" : "Pular o resto"}</button>}</header>
    {boasVindas ? <section className={styles.boasVindas}><Pose nome="acenando" cor={corPersonagem} largura={185} className={styles.mascote}/><h1 className={styles.saudacao}>Oi, {nome.trim() || parteEmail}</h1><p>Vamos montar seu perfil na Cleo? Leva um minuto<br/>e deixa tudo com a sua cara.</p><button className={styles.comecar} onClick={() => setBoasVindas(false)}><Icone nome="direita" tamanho={20}/>Começar</button></section> : <div className={styles.moldura}>
      <section className={styles.formulario} aria-label={`Etapa ${etapa+1}: ${atual}`}>
        <div className={styles.conteudo} key={etapa}>
          {etapa === 0 && <form id="cadastro-form" onSubmit={avancar}>
            <h1 ref={tituloRef} tabIndex={-1}>Primeiro, quem é você?</h1><p className={styles.descricao}>É assim que a Cleo vai te conhecer. Dá para mudar depois, no seu perfil.</p>
            <div className={styles.campos}>
              <label className={styles.campo}><span>Seu nome</span><input value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" maxLength={60} required/></label>
              <label className={styles.campo}><span>Seu @<small>seu identificador na Cleo</small></span><span className={styles.inputComIcone}><b aria-hidden="true">@</b><input value={identificador} onChange={e => {setIdentificador(e.target.value.toLowerCase().replace(/^@/,""));setDisponivel("livre");}} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={30} pattern="[a-z0-9_]{3,30}" placeholder="seunome" required aria-invalid={disponivel === "nao"}/>{handleValido && <i className={disponivel === "nao" ? styles.handleOcupado : styles.handleStatus}>{disponivel === "consultando" ? <span className={styles.spinner}/> : disponivel === "sim" || identificador === eu.conta.identificador ? <Icone nome="check" tamanho={16}/> : disponivel === "nao" ? <Icone nome="x" tamanho={16}/> : null}</i>}</span>{disponivel === "nao" && <small className={styles.erroCampo}>Esse identificador já está em uso.</small>}{identificador && !handleValido && <small className={styles.dicaCampo}>Use de 3 a 30 letras minúsculas, números ou sublinhado.</small>}</label>
              <label className={styles.campo}><span>O que você está construindo?<small>{bio.length}/80</small></span><input value={bio} onChange={e => setBio(e.target.value)} placeholder="Uma ferramenta que transforma ideias em negócios" maxLength={80}/></label>
              <label className={styles.campo}><span>Seu WhatsApp<small>opcional · não aparece no cartão</small></span><span className={styles.inputComIcone}><Icone nome="fala" tamanho={17}/><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" autoComplete="tel" placeholder="+55 (11) 98765-4321" maxLength={30}/></span></label>
            </div>
          </form>}
          {etapa === 1 && <><h1 ref={tituloRef} tabIndex={-1}>Escolhe quem te representa</h1><p className={styles.descricao}>Uma Cleo para chamar de sua. Escolha quem combina com você e a cor do seu espaço.</p><div className={styles.avatares} role="group" aria-label="Escolha seu avatar">{AVATARES.map(a => <button key={a.id} className={styles.avatarOpcao} aria-pressed={avatar === a.id && corPersonagem === a.cor} aria-label={`Cleo ${a.nome}, ${corDaPersonagem(a.cor).nome}`} onClick={() => {setAvatar(a.id);setCorPersonagem(a.cor);}}><Pose nome={a.id} cor={a.cor} largura={145}/>{avatar === a.id && corPersonagem === a.cor && <span><Icone nome="check" tamanho={12}/></span>}</button>)}</div><PaletaPrincipal valor={cor} onChange={setCor}/></>}
          {etapa === 2 && <><h1 ref={tituloRef} tabIndex={-1}>O que te traz até a Cleo?</h1><p className={styles.descricao}>Conte um pouco do seu momento. Assim, as próximas ideias fazem mais sentido para você.</p><span className={styles.rotulo}>Você se identifica como</span><div className={styles.perfis} role="group" aria-label="Seu perfil">{PERFIS.map(p => <button key={p.id} aria-pressed={perfil === p.id} onClick={() => setPerfil(p.id)}><Icone nome={p.icone} tamanho={18}/>{p.nome}</button>)}</div><span className={styles.rotulo}>O que você quer encontrar?</span><div className={styles.objetivos} role="group" aria-label="Seu objetivo">{OBJETIVOS.map(o => <button key={o.id} aria-pressed={objetivo === o.id} onClick={() => setObjetivo(o.id)}><Icone nome={o.icone} tamanho={21}/><span><b>{o.nome}</b><small>{o.descricao}</small></span><i>{objetivo === o.id && <Icone nome="check" tamanho={12}/>}</i></button>)}</div></>}
          {etapa === 3 && <><h1 ref={tituloRef} tabIndex={-1}>O que você está construindo?</h1><p className={styles.descricao}>Seu projeto ajuda a Cleo a encontrar referências mais próximas do que você faz.</p><div className={styles.projetoEscolha} role="group" aria-label="Você já tem um projeto?"><button aria-pressed={temProjeto} onClick={() => setTemProjeto(true)}><Icone nome="foguete" tamanho={18}/>Já tenho um projeto</button><button aria-pressed={!temProjeto} onClick={() => setTemProjeto(false)}><Icone nome="ideia" tamanho={18}/>Estou buscando uma ideia</button></div>{temProjeto ? <div className={styles.campos}><label className={styles.campo}><span>Nome do projeto</span><input value={projeto.nome} onChange={e => setProjeto({...projeto,nome:e.target.value})} placeholder="O nome da sua próxima grande ideia" maxLength={80}/></label><label className={styles.campo}><span>Site ou link<small>opcional</small></span><input value={projeto.link} onChange={e => setProjeto({...projeto,link:e.target.value})} placeholder="seuprojeto.com.br" maxLength={300} inputMode="url"/></label><div><span className={styles.rotulo}>Tipo de projeto</span><div className={styles.chips} role="group" aria-label="Tipo de projeto">{TIPOS_NEGOCIO.map(t => <button key={t.id} aria-pressed={projeto.tipo === t.id} onClick={() => setProjeto({...projeto,tipo:projeto.tipo === t.id ? null : t.id as TipoNegocio})}>{t.t}</button>)}</div></div><label className={styles.campo}><span>O que ele faz?</span><input value={projeto.o_que_faz} onChange={e => setProjeto({...projeto,o_que_faz:e.target.value})} placeholder="Em uma frase, que problema ele resolve?" maxLength={300}/></label></div> : <div className={styles.semProjeto}><Pose nome="pensando" largura={95}/><h2>O próximo começo pode estar aqui.</h2><p>Vamos procurar ideias e referências com você.</p></div>}</>}
        </div>
        {erro && <p className={styles.erro} role="alert">{erro}</p>}
        <footer className={styles.rodape}><nav className={styles.progresso} aria-label="Etapas do cadastro">{ETAPAS.map((t,i) => <button key={t} disabled={salvando} aria-label={`Etapa ${i+1}: ${t}`} aria-current={etapa === i ? "step" : undefined} data-feita={i < etapa || undefined} onClick={() => ir(i)}/>)}</nav><div className={styles.navegacao}>{etapa > 0 && <button className={styles.voltar} aria-label="Voltar uma etapa" disabled={salvando} onClick={() => ir(etapa-1)}><Icone nome="voltar" tamanho={19}/></button>}<button className={styles.continuar} form={etapa === 0 ? "cadastro-form" : undefined} type={etapa === 0 ? "submit" : "button"} disabled={avancarDesabilitado} onClick={etapa === 0 ? undefined : () => editando && etapa === 1 ? salvarAparencia() : avancar()}>{salvando ? <><span className={styles.spinner}/>Aguarde…</> : editando && etapa === 1 ? "Salvar aparência" : etapa === ULTIMA_ETAPA ? "Entrar na Cleo" : "Continuar"}</button></div></footer>
      </section>
      <aside className={styles.previa} aria-label="Prévia do seu cartão de perfil"><CartaoPerfil eu={eu} nome={nome} identificador={identificador} bio={bio} avatar={avatar} cor={cor} corPersonagem={corPersonagem} projeto={temProjeto ? projeto : null} objetivo={objetivo}/><p className={styles.legendaPrevia}>seu perfil na Cleo, montado enquanto você escreve</p></aside>
    </div>}
  </main>;
}

function CartaoPerfil({eu,nome,identificador,bio,avatar,cor,corPersonagem,projeto,objetivo}:{eu:Eu;nome:string;identificador:string;bio:string;avatar:AvatarId;cor:CorPerfilId;corPersonagem:CorPersonagemId;projeto:{nome:string;link:string;o_que_faz:string}|null;objetivo:Objetivo|null}) {
  const data = eu.conta.criado_em ? new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"short",timeZone:"America/Belem"}).format(new Date(eu.conta.criado_em)).replaceAll(".","") : null;
  return <article className={styles.cartao}>
    <header className={styles.cartaoTopo}><div><IconeBru tamanho={28}/><b>Cleo</b></div><span>SEU PERFIL<small>{data ? `desde ${data}` : "feito para você"}</small></span></header>
    <div className={styles.cartaoPessoa}><span className={styles.avatarCartao}><AvatarUsuario avatar={avatar} cor={cor} corPersonagem={corPersonagem} tamanho={65}/></span><div><h2>{nome.trim() || "Seu nome"}</h2><span>@{identificador || "seunome"}</span></div></div>
    <p className={`${styles.cartaoBio} ${!bio.trim() ? styles.placeholder : ""}`}>{bio.trim() || "O que você está construindo, numa linha."}</p>
    <div className={`${styles.cartaoProjeto} ${projeto?.nome.trim() ? styles.projetoPreenchido : ""}`}>{projeto?.nome.trim() ? <><LogoSite site={dominio(projeto.link)} letra={projeto.nome.trim()[0].toUpperCase()}/><b>{projeto.nome}</b><span>{projeto.o_que_faz || dominio(projeto.link) || "Uma ideia ganhando forma."}</span></> : <span>seu projeto aparece aqui</span>}</div>
    <footer className={styles.cartaoRodape}><div><small>SEU PRÓXIMO GRANDE COMEÇO</small><span>{objetivo === "criativos" ? "Conteúdo que abre possibilidades" : objetivo === "os_dois" ? "Ideias e conteúdo, lado a lado" : "Ideias que viram projetos"}</span></div><span className={styles.pontosCartao} aria-hidden="true">{Array.from({length:15},(_,i) => <i key={i}/>)}</span></footer>
  </article>;
}

function PaletaPrincipal({valor,onChange}:{valor:CorPerfilId;onChange:(cor:CorPerfilId)=>void}) {
  return <fieldset className={styles.paleta}><legend className="oculto">Cor principal</legend><div className={styles.cores}>{CORES_PERFIL.map(c => <button key={c.id} type="button" aria-label={`Cor principal: ${c.nome}`} title={c.nome} aria-pressed={valor === c.id} style={{background:c.cor,color:c.cor}} onClick={() => onChange(c.id)}/>)}</div></fieldset>;
}
