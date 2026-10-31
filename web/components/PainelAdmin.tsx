"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api";
import type { Eu } from "@/lib/tipos";
import { estiloTema } from "@/lib/identidade";
import { Logo } from "./Logo";
import { Icone } from "./Icone";
import { AvatarUsuario } from "./AvatarUsuario";
import { IconeAdmin } from "./IconeAdmin";
import styles from "./PainelAdmin.module.css";

type Usuario = { id:string; nome:string|null; email:string; avatar?:string; cor_perfil?:string; cor_personagem?:string; criado_em:string; plano:string|null };
type Busca = { id:string; termos:string[]; status:string; vistos:number; criado_em:string; fim_em:string|null; espaco:string };
type Registro = { tipo:string; titulo:string|null; descricao:string; avatar?:string; cor_perfil?:string; cor_personagem?:string; data:string };
type Dia = { dia:string; usuarios:number; garimpos:number };
export type DadosAdmin = {
  atualizado_em:string; dias:number;
  totais:{ usuarios:number; usuarios_periodo:number; usuarios_anterior:number; garimpos:number; garimpos_anterior:number; concluidos:number; erros:number; em_andamento:number; videos:number; colecoes:number };
  serie:Dia[]; usuarios:Usuario[]; garimpos:Busca[];
  faturamento:{status:"nao_configurado";moeda:"BRL";recebido_centavos:number|null;mrr_centavos:number|null;assinaturas_ativas:number|null};
  videos:{id:string;autor:string|null;texto:string|null;fonte:string;views:number|null;visto_primeiro:string}[];
  atividade:Registro[];
};
const ABAS = [
  {id:"visao",nome:"Visão geral",icone:"inicio"}, {id:"usuarios",nome:"Usuários",icone:"pessoas"},
  {id:"garimpos",nome:"Garimpos",icone:"planilha"}, {id:"biblioteca",nome:"Biblioteca",icone:"pacote"},
] as const;
type Aba = typeof ABAS[number]["id"];
const numero = (n:number) => n.toLocaleString("pt-BR");
const dinheiro = (centavos?:number|null) => centavos == null ? "—" : (centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const data = (s:string, op:Intl.DateTimeFormatOptions = {day:"2-digit",month:"short"}) => new Date(s).toLocaleDateString("pt-BR",{...op,timeZone:"UTC"});
const STATUS:Record<string,string> = {concluido:"Concluído",erro:"Erro",parado:"Interrompido",garimpando:"Em andamento",aguardando:"Na fila"};

function Variacao({atual,anterior}:{atual:number;anterior:number}) {
  const diferenca = atual-anterior;
  return <small className={diferenca<0 ? styles.queda : styles.alta}>{diferenca<0 ? "−" : "+"}{numero(Math.abs(diferenca))} no período</small>;
}

function Grafico({serie}:{serie:Dia[]}) {
  const [ativo,setAtivo] = useState<number|null>(null);
  const maximo = Math.max(4,...serie.flatMap(d=>[d.usuarios,d.garimpos]));
  const x = (i:number) => 42+i*(624/Math.max(1,serie.length-1));
  const y = (n:number) => 220-n/maximo*184;
  const linha = (campo:"usuarios"|"garimpos") => serie.map((d,i)=>{
    if (i===0) return `M${x(i)},${y(d[campo])}`;
    const meio = (x(i-1)+x(i))/2;
    return `C${meio},${y(serie[i-1][campo])} ${meio},${y(d[campo])} ${x(i)},${y(d[campo])}`;
  }).join(" ");
  const selecionado = ativo === null ? null : serie[ativo];
  return <div className={styles.grafico} onMouseLeave={()=>setAtivo(null)}>
    <div className={styles.legenda}><span><i/>Cadastros</span><span><i/>Garimpos</span></div>
    <svg viewBox="0 0 690 270" role="img" aria-label={`Evolução diária de cadastros e garimpos em ${serie.length} dias, em UTC`}>
      <defs><linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a4cde9" stopOpacity=".22"/><stop offset="1" stopColor="#a4cde9" stopOpacity="0"/></linearGradient></defs>
      {[0,1,2,3,4].map(n=><g key={n}><line x1="42" x2="666" y1={y(maximo*n/4)} y2={y(maximo*n/4)} stroke="#f1f1f3"/><text x="2" y={y(maximo*n/4)+4}>{Math.round(maximo*n/4)}</text></g>)}
      {serie.length>0 && <><path d={`${linha("usuarios")} L666,220 L42,220 Z`} fill="url(#admin-area)"/><path d={linha("usuarios")} className={styles.linhaAzul}/><path d={linha("garimpos")} className={styles.linhaLaranja}/></>}
      {serie.map((d,i)=>(i===0||i===serie.length-1||i%Math.ceil(serie.length/7)===0)&&<text key={d.dia} x={x(i)} y="251" textAnchor="middle">{data(d.dia,{day:"2-digit",month:"2-digit"})}</text>)}
      {selecionado && ativo!==null && <g><line x1={x(ativo)} x2={x(ativo)} y1="20" y2="220" stroke="#d4d8e0" strokeDasharray="4 4"/><circle cx={x(ativo)} cy={y(selecionado.usuarios)} r="4" fill="#72a9ce"/><circle cx={x(ativo)} cy={y(selecionado.garimpos)} r="4" fill="#f2b57e"/></g>}
    </svg>
    <div className={styles.pontos}>{serie.map((d,i)=><button key={d.dia} aria-label={`${data(d.dia)}: ${d.usuarios} cadastros e ${d.garimpos} garimpos`} style={{left:`${(x(i)/690)*100}%`,width:`${Math.max(1,90/serie.length)}%`}} onMouseEnter={()=>setAtivo(i)} onFocus={()=>setAtivo(i)} onBlur={()=>setAtivo(null)} onClick={()=>setAtivo(i)}/>)}</div>
    {selecionado && ativo!==null && <div className={styles.tooltip} style={{left:`${Math.min(70,Math.max(10,x(ativo)/690*100))}%`}}><b>{data(selecionado.dia,{day:"2-digit",month:"long"})}</b><span><i/>Cadastros <strong>{selecionado.usuarios}</strong></span><span><i/>Garimpos <strong>{selecionado.garimpos}</strong></span></div>}
    {!serie.some(d=>d.usuarios||d.garimpos) && <p className={styles.semMovimento}>Nenhuma atividade neste período.</p>}
  </div>;
}

export function PainelAdmin() {
  const ajuda = useRef<HTMLDialogElement>(null);
  const [aba,setAba] = useState<Aba>("visao");
  const [dias,setDias] = useState(7);
  const [busca,setBusca] = useState("");
  const {dados:eu} = useApi<Eu>("/api/eu");
  const {dados,erro,carregando,recarregar} = useApi<DadosAdmin>(`/api/admin/painel?dias=${dias}`);
  const t = dados?.totais;
  const nome = eu?.conta.nome?.split(" ")[0] || "Felipe";
  const sucesso = t && t.concluidos+t.erros>0 ? Math.round(t.concluidos/(t.concluidos+t.erros)*100) : null;
  const q = busca.trim().toLocaleLowerCase("pt-BR");
  const usuarios = dados?.usuarios.filter(u=>`${u.nome} ${u.email}`.toLocaleLowerCase("pt-BR").includes(q)) ?? [];
  const garimpos = dados?.garimpos.filter(g=>`${g.termos.join(" ")} ${g.espaco} ${STATUS[g.status]}`.toLocaleLowerCase("pt-BR").includes(q)) ?? [];

  return <div className={styles.fundo} style={estiloTema(eu?.conta.cor_perfil,eu?.conta.cor_personagem)}><div className={styles.painel}>
    <aside className={styles.menu}><Link href="/inicio" aria-label="Wae, voltar ao aplicativo"><Logo tamanho={27} triangulo/></Link>
      <nav aria-label="Administração">{ABAS.map(a=><button key={a.id} aria-current={aba===a.id?"page":undefined} onClick={()=>{setAba(a.id);setBusca("");}}><IconeAdmin nome={a.id}/><span>{a.nome}</span>{(a.id==="usuarios"||a.id==="garimpos")&&<span className={styles.menuAtalho} aria-hidden="true"><Icone nome="mais" tamanho={13}/></span>}</button>)}<Link href="/config"><IconeAdmin nome="config"/><span>Configurações</span></Link></nav>
      <div className={styles.convite}><h2>Seu espaço Wae</h2><p>Todos os seus projetos<br/>em um só lugar.</p><Link href="/inicio">Abrir aplicativo</Link></div>
      <div className={styles.menuRodape}><button onClick={()=>ajuda.current?.showModal()}><IconeAdmin nome="ajuda"/>Ajuda e informações</button><Link href="/inicio"><IconeAdmin nome="voltar"/>Sair do painel</Link></div>
    </aside>
    <main className={styles.principal}>
      <header className={styles.cabecalho}><div><h1>Olá, {nome}</h1><p>Seu negócio em movimento. Tudo começa por aqui.</p></div><span className={styles.data}>{dados ? data(dados.atualizado_em,{day:"2-digit",month:"short",year:"numeric"}) : "Hoje"}<span><Icone nome="relogio" tamanho={22}/></span></span></header>
      {erro ? <div className={styles.erro} role="alert"><Icone nome="cadeado" tamanho={30}/><h2>{erro.status===403?"Acesso restrito":"Não foi possível carregar o painel"}</h2><p>{erro.status===403?"Esta conta não tem permissão para consultar a administração.":"Tente carregar os dados novamente."}</p>{erro.status!==403&&<button onClick={recarregar}>Tentar novamente</button>}</div> : !dados ? <div className={styles.carregando} role="status">Carregando dados do painel…<div/><div/><div/></div> : <>
      {aba==="usuarios" && <section className={styles.indicadores} aria-label="Indicadores de usuários"><div><span className={styles.iconeMetrica}><Icone nome="pessoas" tamanho={24}/></span><div><h2>Usuários</h2><p>{numero(t!.usuarios)} <Variacao atual={t!.usuarios_periodo} anterior={t!.usuarios_anterior}/></p></div></div><div><span className={styles.iconeMetrica}><Icone nome="relogio" tamanho={24}/></span><div><h2>Garimpos</h2><p>{numero(t!.garimpos)} <Variacao atual={t!.garimpos} anterior={t!.garimpos_anterior}/></p></div></div><div><span className={styles.iconeMetrica}><Icone nome="grafico" tamanho={24}/></span><div><h2>Conclusão</h2><p>{sucesso===null?"—":`${sucesso}%`}<small className={styles.alta}>{t!.em_andamento} em andamento</small></p></div></div></section>}

      {aba==="usuarios" && <section className={styles.desempenho}><div className={styles.secaoTopo}><h2>Desempenho</h2><label className={styles.periodo}><span className="oculto">Período do painel</span><select value={dias} onChange={e=>setDias(Number(e.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label></div><Grafico serie={dados.serie}/></section>}
      {aba==="visao" && <section className={styles.indicadores} aria-label="Indicadores de faturamento">
        <div><span className={styles.iconeMetrica}><Icone nome="grafico" tamanho={24}/></span><div><h2>Faturamento</h2><p>{dinheiro(dados.faturamento?.recebido_centavos)}</p><small className={styles.detalheFinanceiro}>Recebido no período</small></div></div>
        <div><span className={styles.iconeMetrica}><Icone nome="refazer" tamanho={24}/></span><div><h2>Receita mensal</h2><p>{dinheiro(dados.faturamento?.mrr_centavos)}</p><small className={styles.detalheFinanceiro}>Recorrente (MRR)</small></div></div>
        <div><span className={styles.iconeMetrica}><Icone nome="pessoas" tamanho={24}/></span><div><h2>Assinaturas</h2><p>{dados.faturamento?.assinaturas_ativas == null ? "—" : numero(dados.faturamento.assinaturas_ativas)}</p><small className={styles.detalheFinanceiro}>Ativas e pagas</small></div></div>
      </section>}
      {aba==="visao" ? <><section className={styles.desempenho}><div className={styles.secaoTopo}><h2>Faturamento</h2><label className={styles.periodo}><span className="oculto">Período do painel</span><select value={dias} onChange={e=>setDias(Number(e.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label></div><div className={styles.financeiroVazio}><span><Icone nome="grafico" tamanho={27}/></span><h3>Acompanhe sua receita por aqui</h3><p>Os pagamentos ainda não estão conectados.</p><small>Faturamento e assinaturas serão exibidos após a conexão.</small></div></section><section className={styles.recentes}><div className={styles.secaoTopo}><h2>Garimpos recentes</h2><span>{t!.em_andamento} em andamento</span><button onClick={()=>setAba("garimpos")}>Ver todos <Icone nome="direita" tamanho={15}/></button></div>{dados.garimpos.length===0?<p className={styles.vazio}>Os garimpos aparecerão aqui assim que forem iniciados.</p>:dados.garimpos.slice(0,4).map((g,i)=><div className={styles.buscaLinha} key={g.id}><span className={styles.buscaIcone} data-tom={i%3}><Icone nome="radar" tamanho={22}/></span><div><b>{g.termos.join(", ")||"Sem termo"}</b><small>{g.espaco}</small></div><span className={styles.status} data-status={g.status}><i/>{STATUS[g.status]||g.status}</span><span className={styles.vistos}>{numero(g.vistos)} vídeos</span></div>)}</section></> : <section className={styles.listagem}><div className={styles.secaoTopo}><h2>{ABAS.find(a=>a.id===aba)?.nome}</h2><span>{aba==="usuarios"?"100 mais recentes":aba==="garimpos"?"100 mais recentes":`${numero(t!.videos)} vídeos na biblioteca`}</span></div>{aba!=="biblioteca"&&<label className={styles.busca}><Icone nome="busca" tamanho={18}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder={aba==="usuarios"?"Buscar por nome ou e-mail":"Buscar por termo, espaço ou status"}/></label>}
        <div className={styles.tabela}>{aba==="usuarios"?<table><thead><tr><th>Usuário</th><th>Plano</th><th>Cadastro</th></tr></thead><tbody>{usuarios.map(u=><tr key={u.id}><td><div className={styles.pessoa}><AvatarUsuario avatar={u.avatar} cor={u.cor_perfil} corPersonagem={u.cor_personagem} tamanho={35}/><span><b>{u.nome||"Sem nome"}</b><small>{u.email}</small></span></div></td><td><span className={styles.plano}>{u.plano||"Sem espaço"}</span></td><td>{data(u.criado_em)}</td></tr>)}</tbody></table>:aba==="garimpos"?<table><thead><tr><th>Pesquisa</th><th>Status</th><th>Vídeos</th></tr></thead><tbody>{garimpos.map(g=><tr key={g.id}><td><b>{g.termos.join(", ")}</b><small>{g.espaco} · {data(g.criado_em)}</small></td><td><span className={styles.status} data-status={g.status}><i/>{STATUS[g.status]||g.status}</span></td><td>{numero(g.vistos)}</td></tr>)}</tbody></table>:<table><thead><tr><th>Vídeo</th><th>Fonte</th><th>Views</th></tr></thead><tbody>{dados.videos.map(v=><tr key={v.id}><td><b className={styles.videoTitulo}>{v.texto||"Sem legenda"}</b><small>{v.autor||"Sem autor"}</small></td><td>{v.fonte}</td><td>{v.views===null?"—":numero(v.views)}</td></tr>)}</tbody></table>}</div>
        {(aba==="usuarios"&&!usuarios.length||aba==="garimpos"&&!garimpos.length||aba==="biblioteca"&&!dados.videos.length)&&<p className={styles.vazio}>Nenhum registro encontrado.</p>}
      </section>}
      </>}
    </main>
    <aside className={styles.lateral}><div className={styles.perfil}><AvatarUsuario avatar={eu?.conta.avatar} cor={eu?.conta.cor_perfil} corPersonagem={eu?.conta.cor_personagem} tamanho={84}/><h2>{eu?.conta.nome||"Administrador"}</h2><p>@{eu?.conta.identificador||"admin"}</p><div><button onClick={recarregar} disabled={carregando} aria-label="Atualizar painel" title="Atualizar painel"><Icone nome="refazer" tamanho={20}/></button><Link href="/config" aria-label="Configurações do perfil" title="Configurações do perfil"><Icone nome="ajustes" tamanho={20}/></Link><Link href="/inicio" aria-label="Abrir aplicativo" title="Abrir aplicativo"><Icone nome="abrir" tamanho={20}/></Link></div></div><div className={styles.atividadeTitulo}><i/><h2>Atividade</h2><i/></div><div className={styles.atividade}>{dados?.atividade.length?dados.atividade.map((a,i)=><article key={`${a.tipo}-${a.data}-${i}`}><AvatarUsuario avatar={a.avatar} cor={a.cor_perfil} corPersonagem={a.cor_personagem} tamanho={34}/><div><header><b>{a.titulo||"Novo usuário"}</b><time dateTime={a.data}>{data(a.data,{day:"2-digit",month:"2-digit"})}</time></header><p>{a.tipo==="cadastro"?"Novo começo na ":"Pesquisa na "}<span>Wae</span></p><div className={styles.atividadeCartao}><Icone nome={a.tipo==="cadastro"?"usuario":"radar"} tamanho={19}/><span>{a.descricao}</span></div></div></article>):<p className={styles.vazio}>{dados?"Nenhuma atividade registrada.":"Carregando atividade…"}</p>}</div><div className={styles.atualizacao}><span><i/>{dados?`Atualizado às ${new Date(dados.atualizado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`:"Conectando ao painel"}</span><button onClick={recarregar} disabled={carregando} aria-label="Recarregar dados"><Icone nome="refazer" tamanho={17}/></button></div></aside>
  </div><dialog ref={ajuda} className={styles.ajuda} onClick={e=>{if(e.target===e.currentTarget) ajuda.current?.close();}} aria-labelledby="admin-ajuda-titulo"><h2 id="admin-ajuda-titulo">Seu painel administrativo</h2><p>A visão geral reúne o faturamento. Na aba Usuários, consulte os indicadores de uso, o gráfico de atividade e os cadastros. O filtro de período usa dias em UTC.</p><p>As listas mostram os registros mais recentes. Este painel permite consultar os dados; alterações de conta e perfil ficam em Configurações.</p><button onClick={()=>ajuda.current?.close()}>Entendi</button></dialog></div>;
}
