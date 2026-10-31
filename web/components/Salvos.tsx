"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import { capaUrl } from "@/lib/fmt";
import { rotaAnalisar } from "@/lib/navegacaoVideo";
import type { Colecao, Ideia, Video } from "@/lib/tipos";
import { CartaoIdeia, CartaoVideo } from "./Cartoes";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";
import { IconePasta } from "./IconesSidebar";
import { JanelaColecao } from "./JanelaColecao";
import styles from "./Colecoes.module.css";

type Detalhe = { id: string; nome: string; itens: ({ tipo: "video"; salvo_em: string; video: Video } | { tipo: "ideia"; salvo_em: string; ideia: Ideia } | { tipo: "analise"; salvo_em: string; video: Video; resumo: string })[] };

export function Salvos({ colecaoId }: { colecaoId: string | null }) {
  const router = useRouter();
  const { avisar } = useApp();
  const { dados: colecoes, erro, recarregar } = useApi<Colecao[]>("/api/colecoes", { atualizarAoInvalidar: true });
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const filtradas = colecoes?.filter(c => c.nome.toLocaleLowerCase().includes(busca.trim().toLocaleLowerCase()));

  return <section className={styles.biblioteca}>
    <header className={styles.cabecalho}><div className={styles.tituloPagina}><span className={styles.emblema}><Icone nome="salvo" tamanho={22}/></span><div><h1>Salvos</h1><p>Boas referências merecem um lugar para voltar.</p></div></div><button className={styles.primario} onClick={() => setCriando(true)}><Icone nome="mais" tamanho={16}/>Nova pasta</button></header>
    {colecaoId ? <DetalheColecao key={colecaoId} id={colecaoId} aoApagar={async () => {limparCache("/api/colecoes");await recarregar();router.replace("/salvos");avisar("Coleção apagada");}} aoMudar={recarregar}/> : <>
      <div className={styles.barraBiblioteca}><div><h2>Suas pastas</h2>{colecoes && <span>{colecoes.length} {colecoes.length === 1 ? "coleção" : "coleções"}</span>}</div><label className={styles.buscaPastas}><Icone nome="busca" tamanho={15}/><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pasta…" aria-label="Buscar pasta"/></label></div>
      {erro ? <div className={styles.erroPagina} role="alert"><p>{erro.message}</p><button className={styles.secundario} onClick={recarregar}>Tentar novamente</button></div> : !colecoes ? <div className={styles.gradePastas} role="status" aria-label="Carregando pastas">{[0,1,2].map(n => <div key={n} className={`${styles.pastaEsqueleto} esqueleto`}/>)}</div> : colecoes.length === 0 ? <div className={styles.vazioBiblioteca}>
        <div className={styles.ilustracaoPastas} aria-hidden="true"><span><IconePasta cor="#dfd6b8" tamanho={70}/></span><span><IconePasta cor="#caa735" tamanho={88}/></span></div>
        <span className={styles.sobreTitulo}>SUA BIBLIOTECA DE REFERÊNCIAS</span><h2>Uma pasta para cada boa ideia.</h2><p>Guarde vídeos e ideias por nicho, cliente ou projeto. <br/>Tudo organizado para quando você precisar.</p><div className={styles.acoesVazio}><button className={styles.primario} onClick={() => setCriando(true)}><Icone nome="mais" tamanho={15}/>Criar minha primeira pasta</button><Link className={styles.linkDiscreto} href="/pesquisa">Explorar vídeos<Icone nome="direita" tamanho={14}/></Link></div>
        <div className={styles.dicaVazio}><Icone nome="salvo" tamanho={13}/><span>Use o ícone de salvar em qualquer vídeo ou ideia.</span></div>
      </div> : filtradas?.length === 0 ? <div className={styles.semResultados}><Icone nome="busca" tamanho={25}/><h3>Nenhuma pasta encontrada</h3><p>Tente outro nome ou crie uma nova pasta.</p><button className={styles.secundario} onClick={() => setBusca("")}>Limpar busca</button></div> : <div className={styles.gradePastas}>
        {filtradas?.map(c => <Link key={c.id} href={`/salvos/${c.id}`} className={styles.cartaoPasta}><div className={styles.pastaCapa}>{c.capas?.length ? <div className={styles.miniCapas}>{c.capas.slice(0,3).map((capa,n) => <span key={`${capa}-${n}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capaUrl(capa)!} alt="" loading="lazy"/>
        </span>)}</div> : <IconePasta cor="#c9a334" tamanho={68}/>}<span className={styles.seloPasta}><IconePasta cor="#b2943e" tamanho={17}/></span></div><div className={styles.pastaCartaoRodape}><div><h3>{c.nome}</h3><p>{c.itens} {Number(c.itens) === 1 ? "item salvo" : "itens salvos"}</p></div><Icone nome="diagonal" tamanho={15}/></div></Link>)}
        <button className={styles.novaPastaCartao} onClick={() => setCriando(true)}><span><Icone nome="mais" tamanho={23}/></span><b>Nova pasta</b><small>Separe suas próximas referências</small></button>
      </div>}
    </>}
    {criando && <CriarPasta fechar={() => setCriando(false)} aoCriar={async c => {limparCache("/api/colecoes");await recarregar();setCriando(false);router.push(`/salvos/${c.id}`);avisar("Pasta criada");}}/>}
  </section>;
}

function CriarPasta({ fechar, aoCriar }: { fechar: () => void; aoCriar: (c: Colecao) => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const trava = useRef(false);
  async function criar(e: React.FormEvent) {
    e.preventDefault();if (!nome.trim() || trava.current) return;
    trava.current = true;setOcupado(true);setErro(null);
    try {const c = await api<Colecao>("/api/colecoes", {method:"POST",json:{nome:nome.trim()}});await aoCriar(c);}
    catch (e) {setErro((e as Error).message);}
    finally {trava.current = false;setOcupado(false);}
  }
  return <JanelaColecao titulo="Uma nova pasta" descricao="Dê um nome para organizar suas próximas referências." fechar={fechar}><form onSubmit={criar} className={styles.formNovaPasta}><label htmlFor="nome-nova-pasta">Nome da pasta</label><input id="nome-nova-pasta" autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Referências para meu SaaS" maxLength={60} disabled={ocupado}/><p>Você pode reunir vídeos e ideias na mesma pasta.</p>{erro && <p className={styles.erro} role="alert">{erro}</p>}<div className={styles.acoesForm}><button type="button" className={styles.secundario} onClick={fechar}>Cancelar</button><button className={styles.primario} disabled={!nome.trim() || ocupado}>{ocupado ? "Criando…" : "Criar pasta"}<Icone nome="direita" tamanho={14}/></button></div></form></JanelaColecao>;
}

function DetalheColecao({ id, aoApagar, aoMudar }: { id: string; aoApagar: () => void; aoMudar: () => Promise<void> }) {
  const { avisar } = useApp();
  const { dados, erro, recarregar } = useApi<Detalhe>(`/api/colecoes/${id}`);
  const [filtro, setFiltro] = useState<"todos" | "video" | "ideia" | "analise">("todos");
  const [ocupado, setOcupado] = useState(false);

  if (erro) return <div className={styles.erroPagina}><h2>Não foi possível abrir esta pasta.</h2><Link className={styles.secundario} href="/salvos">Voltar às pastas</Link></div>;
  if (!dados) return <div className={`${styles.pastaEsqueleto} esqueleto`} role="status" aria-label="Carregando coleção"/>;

  async function tirar(tipo: string, item: string) {
    if (ocupado) return;setOcupado(true);
    try {await api(`/api/salvos/${id}/${tipo}/${encodeURIComponent(item)}`, {method:"DELETE"});limparCache("/api/colecoes");await Promise.all([recarregar(),aoMudar()]);avisar("Tirado da pasta");}
    catch (e) {avisar((e as Error).message);}
    finally {setOcupado(false);}
  }
  async function apagar() {
    if (!confirm(`Apagar a coleção “${dados!.nome}”? Os vídeos continuam na biblioteca.`)) return;
    try {await api(`/api/colecoes/${id}`, {method:"DELETE"});aoApagar();}catch (e) {avisar((e as Error).message);}
  }
  async function copiarGanchos() {
    try {const linhas = dados!.itens.filter(i => i.tipo === "video").map((i,n) => {const v=(i as {video:Video}).video;return `${n+1}. ${v.gancho ?? (v.texto || "").split("\n")[0]}\n   ${v.metrica} · ${v.url_original}`;});await navigator.clipboard.writeText(linhas.join("\n"));avisar(`${linhas.length} ganchos copiados`);}catch {avisar("Não foi possível copiar os ganchos.");}
  }
  const videos = dados.itens.filter(i => i.tipo === "video");
  const ideias = dados.itens.filter(i => i.tipo === "ideia");
  const analises = dados.itens.filter(i => i.tipo === "analise");
  const visiveis = dados.itens.filter(i => filtro === "todos" || i.tipo === filtro);
  return <>
    <Link className={styles.voltarPastas} href="/salvos"><Icone nome="voltar" tamanho={14}/>Todas as pastas</Link>
    <div className={styles.colecaoTopo}><div className={styles.colecaoTitulo}><span className={styles.emblema}><IconePasta cor="#b38c1c" tamanho={24}/></span><div><h2>{dados.nome}</h2><p>{dados.itens.length} {dados.itens.length === 1 ? "referência salva" : "referências salvas"}</p></div></div><div className={styles.acoesColecao}><a className={styles.secundario} href={`/api/colecoes/${id}/planilha.csv`} download><Icone nome="baixar" tamanho={14}/>Exportar</a><button className={styles.secundario} onClick={copiarGanchos} disabled={!videos.length}><Icone nome="copiar" tamanho={14}/>Copiar ganchos</button><button className={styles.fechar} onClick={apagar} aria-label="Apagar coleção" title="Apagar coleção"><Icone nome="lixo" tamanho={15}/></button></div></div>
    <div className={styles.filtros} role="group" aria-label="Tipo de conteúdo">{([['todos',`Todos ${dados.itens.length}`],['video',`Vídeos ${videos.length}`],['ideia',`Ideias ${ideias.length}`],['analise',`Análises ${analises.length}`]] as const).map(([valor,rotulo]) => <button key={valor} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{rotulo}</button>)}</div>
    {dados.itens.length === 0 ? <div className={styles.vazioColecao}><IconePasta cor="#c9b36c" tamanho={56}/><h3>Esta pasta está pronta para suas ideias.</h3><p>Salve um vídeo ou uma ideia e escolha “{dados.nome}”.</p><Link className={styles.primario} href="/pesquisa"><Icone nome="busca" tamanho={14}/>Explorar vídeos</Link></div> : !visiveis.length ? <div className={styles.semResultados}><h3>{filtro === "video" ? "Nenhum vídeo" : filtro === "analise" ? "Nenhuma análise" : "Nenhuma ideia"} nesta pasta.</h3><button className={styles.secundario} onClick={() => setFiltro("todos")}>Ver todos</button></div> : <>
      {(filtro === "todos" || filtro === "analise") && analises.length > 0 && <section className={styles.grupoConteudo}><h3>Análises <span>{analises.length}</span></h3><div className={styles.gradeAnalises}>{analises.map(i => <div key={i.video.id} className={styles.itemSalvo}><Link className={styles.cartaoAnalise} href={rotaAnalisar(i.video.id, `/salvos/${id}`)}><span className={styles.tipoAnalise}><Icone nome="analise" tamanho={17}/>Análise com a Wae</span><h3>{i.video.gancho || i.video.texto.split("\n")[0] || "Análise do vídeo"}</h3><p>{i.resumo.replace(/[#*`]/g, "").trim()}</p><span className={styles.abrirAnalise}><span>{i.video.autor || "Vídeo analisado"}</span><b>Abrir análise<Icone nome="direita" tamanho={14}/></b></span></Link><button className={styles.tirar} disabled={ocupado} onClick={() => tirar("analise",i.video.id)}><Icone nome="x" tamanho={12}/>Tirar da pasta</button></div>)}</div></section>}
      {(filtro === "todos" || filtro === "ideia") && ideias.length > 0 && <section className={styles.grupoConteudo}><h3>Ideias <span>{ideias.length}</span></h3><div className="grade-ideias">{ideias.map(i => <div key={i.ideia.id} className={styles.itemSalvo}><CartaoIdeia i={i.ideia}/><button className={styles.tirar} disabled={ocupado} onClick={() => tirar("ideia",i.ideia.id)}><Icone nome="x" tamanho={12}/>Tirar da pasta</button></div>)}</div></section>}
      {(filtro === "todos" || filtro === "video") && videos.length > 0 && <section className={styles.grupoConteudo}><h3>Vídeos <span>{videos.length}</span></h3><div className="grade-videos">{videos.map(i => <div key={i.video.id} className={styles.itemSalvo}><CartaoVideo v={i.video}/><button className={styles.tirar} disabled={ocupado} onClick={() => tirar("video",i.video.id)}><Icone nome="x" tamanho={12}/>Tirar da pasta</button></div>)}</div></section>}
    </>}
  </>;
}
