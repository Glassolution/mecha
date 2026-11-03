"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { FichaVideo } from "@/lib/tipos";
import { PLATAFORMA } from "@/lib/fmt";
import { retornoDosVideos } from "@/lib/navegacaoVideo";
import { useTextoDigitado } from "@/lib/useTextoDigitado";
import { primeiraLinha } from "./Cartoes";
import { Icone } from "./Icone";
import { AbasPilula } from "./Movimento";
import { NumerosVideo } from "./NumerosVideo";
import { PlayerVideo } from "./PlayerVideo";
import { MolduraCelular } from "./MolduraCelular";
import { IconeBru } from "./IconeBru";
import { SalvarEm } from "./SalvarEm";
import { api, useApi } from "@/lib/api";
import { useApp } from "./Contexto";
import { MODELOS_ANALISE, PEDIR_DIVULGACAO, PEDIR_PROMPT, PEDIR_ROTEIRO, PERGUNTA_CRIATIVO, PERGUNTA_INICIAL } from "./ModelosAnalise";
import styles from "./PainelConversa.module.css";

export type MensagemConversa = { id: string; papel: "user" | "assistant"; texto: string; criado_em?: string; animar?: boolean };
export type AnaliseAnterior = { titulo: string; resumo: string; veredito: string; problema: string; publico: string; ideia: string; diferencial: string; encaixe: string; sinais: string[]; riscos: string[]; primeiros_passos: string[]; momentos: { titulo: string; texto: string }[] };

type Props = {
  video: FichaVideo; mensagens: MensagemConversa[]; anterior?: AnaliseAnterior | null; texto: string; mudarTexto: (v: string) => void;
  enviar: (texto: string) => void; respondendo?: boolean; carregando?: boolean; falha?: string | null; bloqueado?: boolean; tentarNovamente: () => void;
};

function negrito(texto: string, parcial = false): ReactNode {
  if (parcial && (texto.match(/\*\*/g)?.length ?? 0) % 2) texto = texto.endsWith("**") ? texto.slice(0,-2) : texto+"**";
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => parte.startsWith("**") && parte.endsWith("**") ? <strong key={i}>{parte.slice(2, -2)}</strong> : <Fragment key={i}>{parte}</Fragment>);
}

/** Formatação de texto sem injetar HTML retornado pelo modelo. */
/** O prompt para o Claude Code vem num bloco ``` e ganha o próprio botão de copiar. */
function BlocoPrompt({ texto, parcial = false }: { texto: string; parcial?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  return <div className={styles.prompt}>
    <pre>{texto}</pre>
    {!parcial && <button onClick={async () => {try {await navigator.clipboard.writeText(texto);setCopiado(true);} catch {setCopiado(false);}}}>
      <Icone nome={copiado ? "check" : "copiar"} tamanho={13}/>{copiado ? "Prompt copiado" : "Copiar prompt"}
    </button>}
  </div>;
}

/** Pré-respostas depois da última resposta: as que a conversa ainda não pediu, conforme o modo em que
ela está (ideia de SaaS ou criativo). Cada modo oferece trocar para o outro. */
const ATALHOS = {
  ideia: [
    { pergunta: PEDIR_DIVULGACAO, rotulo: "Como divulgar", descricao: "Canais e estratégia", icone: "divulgar" },
    { pergunta: PEDIR_PROMPT, rotulo: "Criar o prompt", descricao: "Para o Claude Code", icone: "prompt" },
    { pergunta: PERGUNTA_CRIATIVO, rotulo: "Analisar o criativo", descricao: "Recriar ou contratar", icone: "criativo" },
  ],
  criativo: [
    { pergunta: PEDIR_ROTEIRO, rotulo: "Escrever o roteiro", descricao: "Cena a cena, para gravar", icone: "criativo" },
    { pergunta: PERGUNTA_INICIAL, rotulo: "Ver como ideia de SaaS", descricao: "Problema, solução e mercado", icone: "ideia" },
  ],
} as const;

type Modo = "ideia" | "criativo";
const MODOS = {
  ideia: { nome: "Ideia de SaaS", curto: "Ideia", descricao: "Problema, solução, ideia e mercado", icone: "ideia", pergunta: PERGUNTA_INICIAL },
  criativo: { nome: "Criativo", curto: "Criativo", descricao: "O que deu certo, como recriar e quem grava", icone: "claquete", pergunta: PERGUNTA_CRIATIVO },
} as const;

function modoDaConversa(perguntas: string[]): Modo | null {
  const ultimo = [...perguntas].reverse().find((p) => p === PERGUNTA_CRIATIVO || p === PERGUNTA_INICIAL);
  return ultimo ? (ultimo === PERGUNTA_CRIATIVO ? "criativo" : "ideia") : null;
}

function atalhosDe(perguntas: string[]) {
  return ATALHOS[modoDaConversa(perguntas) ?? "ideia"].filter((a) => !perguntas.includes(a.pergunta));
}

function IconeProximoPasso({ tipo }: { tipo: "divulgar" | "prompt" | "criativo" | "ideia" | "conversa" }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {tipo === "divulgar" ? <>
      <circle cx="5" cy="12" r="3" fill="currentColor" fillOpacity=".1" />
      <path d="M8 12h4m0 0V6a2 2 0 0 1 2-2h3m-5 8v6a2 2 0 0 0 2 2h3m-5-8h7M17 2l2 2-2 2m0 12 2 2-2 2m2-12 2 2-2 2" />
    </> : tipo === "prompt" ? <>
      <rect x="3" y="5" width="18" height="15" rx="3" fill="currentColor" fillOpacity=".07" />
      <path d="m7 11 3 3-3 3m6 0h4M3 9h18M16 2v4m-2-2h4" />
    </> : tipo === "criativo" ? <>
      <rect x="3" y="9" width="18" height="12" rx="2" fill="currentColor" fillOpacity=".07" />
      <path d="M3 9 20 4.5l1 3.5M7 8l2.5-4.5M13 6.5 15.5 2M10 13l5 2.5-5 2.5Z" />
    </> : tipo === "ideia" ? <>
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" fill="currentColor" fillOpacity=".07" />
      <path d="M9.5 20h5M10.5 22h3M12 7v3" />
    </> : <>
      <path d="M14 4H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h2v3l4-3h6a3 3 0 0 0 3-3v-4" fill="currentColor" fillOpacity=".06" />
      <path d="m14 11 6-7 2 2-6 7-3 1 1-3ZM7 9h3m-3 5h3" />
    </>}
  </svg>;
}

function ProximosPassos({ perguntas, indisponivel, perguntar, continuar }: { perguntas: string[]; indisponivel: boolean; perguntar: (texto: string) => void; continuar: () => void }) {
  return <div className={styles.atalhos} aria-label="Próximos passos">
    {atalhosDe(perguntas).map((a, i) => <button key={a.pergunta} type="button" className={i === 0 ? styles.atalhoPrincipal : undefined} disabled={indisponivel} onClick={() => perguntar(a.pergunta)}>
      <span className={styles.atalhoIcone}><IconeProximoPasso tipo={a.icone}/></span>
      <span className={styles.atalhoTexto}><b>{a.rotulo}</b><small>{a.descricao}</small></span>
      <Icone nome="diagonal" tamanho={13}/>
    </button>)}
    <button type="button" className={styles.atalhoConversa} disabled={indisponivel} onClick={continuar}>
      <IconeProximoPasso tipo="conversa"/><span>Continuar conversando</span><Icone nome="direita" tamanho={14}/>
    </button>
  </div>;
}

function TextoConversa({ texto, parcial = false }: { texto: string; parcial?: boolean }) {
  // linhas seguidas do mesmo tipo de lista viram uma lista só, mesmo sem linha em branco depois do título
  const brutas = texto.split("\n");
  const linhas: string[] = [];
  const blocos = new Map<number, string>();
  for (let i = 0; i < brutas.length; i++) {
    if (parcial && i === brutas.length-1 && /^(?:#{1,4}|\*{1,2}|[-+]|\d+[.)]|`{1,2})$/.test(brutas[i].trim())) continue;
    if (brutas[i].trim().startsWith("```")) {
      const fim = brutas.findIndex((l, j) => j > i && l.trim().startsWith("```"));
      const ate = fim === -1 ? brutas.length : fim;
      blocos.set(linhas.length, brutas.slice(i + 1, ate).join("\n").trim());
      linhas.push("```");
      i = ate;
    } else if (brutas[i].trim()) linhas.push(brutas[i].trim());
  }
  const partes: ReactNode[] = [];
  for (let i = 0; i < linhas.length;) {
    if (blocos.has(i)) {
      if (!parcial || blocos.get(i)) partes.push(<BlocoPrompt key={i} texto={blocos.get(i)!} parcial={parcial}/>);
      i++;
      continue;
    }
    const tipo = /^[-*]\s+/.test(linhas[i]) ? "ul" : /^\d+[.)]\s+/.test(linhas[i]) ? "ol" : null;
    if (tipo) {
      const marca = tipo === "ul" ? /^[-*]\s+/ : /^\d+[.)]\s+/;
      const itens: string[] = [];
      while (i < linhas.length && marca.test(linhas[i])) itens.push(linhas[i++].replace(marca, ""));
      const lis = itens.map((item, j) => <li key={j}>{negrito(item,parcial)}</li>);
      partes.push(tipo === "ul" ? <ul key={i}>{lis}</ul> : <ol key={i}>{lis}</ol>);
    } else {
      const linha = linhas[i++];
      partes.push(/^#{1,4}\s+/.test(linha) ? <h3 key={i}>{negrito(linha.replace(/^#{1,4}\s+/, ""),parcial)}</h3> : <p key={i}>{negrito(linha,parcial)}</p>);
    }
  }
  return <div className="ac-prosa">{partes}</div>;
}

function RespostaConversa({texto,animar,aoAvancar,children}:{texto:string;animar:boolean;aoAvancar:()=>void;children:ReactNode}) {
  const escrita = useTextoDigitado(texto,animar);
  useEffect(() => {aoAvancar();}, [escrita.texto,aoAvancar]);
  return <div className={escrita.digitando ? styles.digitando : undefined} aria-busy={escrita.digitando} data-escrevendo={escrita.digitando ? "true" : undefined}>
    <TextoConversa texto={escrita.texto} parcial={escrita.digitando}/>
    {escrita.digitando ? <><span className="oculto">A Cleo está escrevendo a resposta.</span><button type="button" className={styles.mostrarTudo} onClick={escrita.concluir}>Mostrar tudo<Icone nome="baixo" tamanho={11}/></button></> : children}
  </div>;
}

function textoAnterior(a: AnaliseAnterior) {
  const veredito = { vale: "Compensa construir", talvez: "Precisa validar", nao_vale: "Oportunidade a validar" }[a.veredito] ?? a.veredito;
  return `## ${a.titulo}\n\n**${veredito}.** ${a.resumo}\n\n**O problema**\n${a.problema}\n\n**A oportunidade**\n${a.ideia}\n\n**Quem pagaria**\n${a.publico}\n\n**Encaixe no seu negócio**\n${a.encaixe}\n\n**Diferencial**\n${a.diferencial}\n\n**Sinais a favor**\n\n${a.sinais.map((s) => `- ${s}`).join("\n")}\n\n**Riscos**\n\n${a.riscos.map((s) => `- ${s}`).join("\n")}\n\n**Primeiros passos**\n\n${a.primeiros_passos.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}

export function PainelConversa({ video: v, mensagens, anterior, texto, mudarTexto, enviar, respondendo = false, carregando = false, falha, bloqueado = false, tentarNovamente }: Props) {
  const parametros = useSearchParams();
  const voltarPara = retornoDosVideos(parametros.get("origem"), v.garimpo_id);
  const { eu, recarregarEu } = useApp();
  const modoMenu = useRef<HTMLDetailsElement>(null);
  const [contextoAberto, setContextoAberto] = useState(false);
  const [lado, setLado] = useState<"contexto" | "numeros">("contexto");
  const [salvando, setSalvando] = useState(false);
  const [tipoSalvar, setTipoSalvar] = useState<"video" | "analise">("video");
  const { dados: pastasAnalise, recarregar: atualizarPastasAnalise } = useApi<string[]>(`/api/salvos/onde?item_tipo=analise&item_id=${encodeURIComponent(v.id)}`);
  const [salvaAgora, setSalvaAgora] = useState<boolean | null>(null);
  const analiseSalva = salvaAgora ?? !!pastasAnalise?.length;
  const [videoAberto, setVideoAberto] = useState(false);
  const [copiada, setCopiada] = useState<string | null>(null);
  const painelId = useId();
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const estavaRespondendo = useRef(respondendo);
  const seguir = useRef(true);
  const titulo = v.gancho || primeiraLinha(v.texto_completo) || "Vídeo em análise";
  const exibirAnterior = !!anterior;
  const indisponivel = respondendo || carregando || bloqueado;
  const turnos: { id: string; pergunta: string; resposta?: string; salva?: boolean; respostaId?:string; animar?:boolean }[] = anterior ? [{ id: "analise-anterior", pergunta: "Análise deste vídeo", resposta: textoAnterior(anterior), salva: true }] : [];
  for (const mensagem of mensagens) {
    if (mensagem.papel === "user") turnos.push({ id: mensagem.id, pergunta: mensagem.texto });
    else {
      const ultimo = turnos[turnos.length - 1];
      if (ultimo && !ultimo.resposta) {ultimo.resposta = mensagem.texto;ultimo.respostaId = mensagem.id;ultimo.animar = mensagem.animar;}
      else turnos.push({ id: mensagem.id, pergunta: "Análise do vídeo", resposta: mensagem.texto, respostaId:mensagem.id, animar:mensagem.animar });
    }
  }

  const acompanharEscrita = useCallback(() => {
    if (seguir.current) lista.current?.scrollTo({top:lista.current.scrollHeight,behavior:"instant"});
  }, []);

  useEffect(() => {
    if (seguir.current && (mensagens.length || exibirAnterior || respondendo)) lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [mensagens.length, respondendo, exibirAnterior]);

  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [texto]);

  useEffect(() => {
    if (estavaRespondendo.current && !respondendo && document.activeElement === document.body) campo.current?.focus({ preventScroll: true });
    estavaRespondendo.current = respondendo;
  }, [respondendo]);

  useEffect(() => {
    if (!videoAberto) return;
    const fechar = (evento: KeyboardEvent) => { if (evento.key === "Escape") setVideoAberto(false); };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [videoAberto]);

  function perguntar(pergunta: string) {
    if (indisponivel || !pergunta.trim()) return;
    seguir.current = true;
    enviar(pergunta);
  }

  // o modo da conversa: o último pedido de análise feito nela; sem nenhum, o padrão do perfil (cadastro)
  const padrao: Modo = eu?.espaco.interesse === "achar_criativo" ? "criativo" : "ideia";
  const modo = modoDaConversa(turnos.map((t) => t.pergunta)) ?? padrao;

  async function trocarModo(novo: Modo) {
    modoMenu.current?.removeAttribute("open");
    // vira o padrão do perfil para os próximos vídeos
    if (novo !== padrao) api("/api/espaco", { method: "PATCH", json: { interesse: novo === "criativo" ? "achar_criativo" : "achar_ideia" } }).then(recarregarEu).catch(() => {});
    if (novo !== modo && turnos.length) perguntar(MODOS[novo].pergunta);
  }

  function usarModelo(pergunta: string) {
    if (indisponivel) return;
    mudarTexto(pergunta);
    campo.current?.focus({ preventScroll: true });
  }

  function abrirSalvar(tipo: "video" | "analise") {
    setTipoSalvar(tipo);
    setSalvando(true);
  }

  return <div className={`ac ${styles.oficina}`}>
    <section className={styles.chat} aria-label="Conversa sobre o vídeo">
      <header className={styles.barra}>
        <Link href={voltarPara} className={styles.voltar} aria-label="Voltar aos vídeos" title="Voltar aos vídeos"><Icone nome="voltar" tamanho={16}/></Link>
        <h1 className="oculto">Conversa com a Cleo</h1>
        <div className={styles.ferramentas}>
          <button className={styles.salvarAnalise} data-salva={analiseSalva || undefined} aria-label={analiseSalva ? "Análise salva, gerenciar pastas" : "Salvar análise"} aria-haspopup="dialog" title={analiseSalva ? "Gerenciar pastas desta análise" : "Salvar análise em uma pasta"} disabled={indisponivel || !turnos.some(t => !!t.resposta)} onClick={() => abrirSalvar("analise")}><Icone nome={analiseSalva ? "check" : "salvo"} tamanho={13}/><span>{analiseSalva ? "Análise salva" : "Salvar análise"}</span></button>
          <button className={styles.verVideo} aria-expanded={videoAberto} aria-controls={`${painelId}-previa`} onClick={() => setVideoAberto(!videoAberto)}><Icone nome="play" tamanho={13}/>Vídeo</button>
        </div>
      </header>
      <div className={styles.mensagens} ref={lista} onScroll={() => {const el = lista.current;if (el) seguir.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;}}>
        <div>
          {carregando ? <p className={styles.abrindo} role="status">Recuperando sua conversa…</p> : turnos.length ? <div role="log" aria-label="Respostas da conversa" aria-live="polite" aria-relevant="additions text">
            {turnos.map((turno) => <article key={turno.id} className={styles.turno}>
              <div className={styles.pergunta}><p>{turno.pergunta}</p><button disabled={indisponivel} onClick={() => usarModelo(turno.pergunta)} aria-label="Editar pergunta" title="Editar pergunta"><Icone nome="refazer" tamanho={14}/></button></div>
              <div className={styles.resposta}>
                {turno.resposta ? <RespostaConversa key={turno.respostaId ?? turno.id} texto={turno.resposta} animar={!!turno.animar} aoAvancar={acompanharEscrita}><div className={styles.acoesResposta}><button aria-label="Copiar resposta da Cleo" title="Copiar resposta" onClick={async () => {try {await navigator.clipboard.writeText(turno.resposta!);setCopiada(turno.id);}catch {setCopiada(null);}}}><Icone nome={copiada === turno.id ? "check" : "copiar"} tamanho={13}/>{copiada === turno.id ? "Copiado" : "Copiar"}</button><button disabled={indisponivel} onClick={() => perguntar(turno.pergunta)} title="Repetir pergunta" aria-label="Repetir pergunta"><Icone nome="refazer" tamanho={13}/></button>{turno.salva && <span>Análise salva</span>}</div>{turno === turnos[turnos.length - 1] && <ProximosPassos perguntas={turnos.map((t) => t.pergunta)} indisponivel={indisponivel} perguntar={perguntar} continuar={() => campo.current?.focus()}/>}</RespostaConversa> : respondendo ? <div className={styles.pensando} role="status"><IconeBru tamanho={35}/><span>A Cleo está lendo o vídeo, os comentários e o mercado<i className={styles.pontos} aria-hidden="true"><b/><b/><b/></i></span></div> : <p className={styles.abrindo}>Esta pergunta ainda não tem resposta. Tente enviá-la novamente.</p>}
              </div>
            </article>)}
          </div> : <div className={styles.inicio}>
            <div className={styles.identidade}><IconeBru tamanho={48}/><b>Cleo</b><span>Sua parceira de análise</span></div>
            <p>Vamos entender o que está por trás deste vídeo.</p>
            <p>Posso explorar os ganchos, encontrar sinais de demanda e ajudar você a transformar uma ideia em um próximo passo.</p>
            <button className={styles.fonte} onClick={() => {setContextoAberto(true);setVideoAberto(true);}}><Icone nome="claquete" tamanho={15}/><span>{v.autor || "Vídeo selecionado"}</span><Icone nome="diagonal" tamanho={12}/></button>
            <p className={styles.inicioSubtitulo}>Um bom ponto de partida:</p>
            <ul className={styles.sugestoes}>{MODELOS_ANALISE.slice(0,3).map((modelo) => <li key={modelo.id}><button disabled={indisponivel} onClick={() => usarModelo(modelo.pergunta)}>{modelo.nome}<Icone nome="diagonal" tamanho={12}/></button></li>)}</ul>
            <p className={styles.notaContexto}>A análise considera a legenda, os números e{v.transcrito ? " a transcrição disponível." : " as informações disponíveis do vídeo."}</p>
          </div>}
        </div>
      </div>
      <div className={styles.compositorArea}>
        {falha && <div className="ac-falha" role="alert"><span>{falha}</span><button onClick={tentarNovamente}>Tentar novamente</button></div>}
        <form className={styles.compositor} aria-busy={respondendo} onSubmit={(e) => {e.preventDefault();perguntar(texto);}}>
          <label className="oculto" htmlFor={`${painelId}-pergunta`}>Sua pergunta sobre o vídeo</label>
          <textarea id={`${painelId}-pergunta`} ref={campo} rows={2} maxLength={4000} value={texto} disabled={indisponivel} placeholder="Pergunte à Cleo sobre este vídeo…" onChange={(e) => mudarTexto(e.target.value)} onKeyDown={(e) => {if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault();if (texto.trim()) perguntar(texto);}}}/>
          <div className={styles.compositorPe}>
            <button type="button" className={styles.contextoIcone} aria-label="Ver contexto do vídeo" title="Ver contexto do vídeo" onClick={() => {setContextoAberto(true);setVideoAberto(true);}}><Icone nome="link" tamanho={17}/></button>
            <details ref={modoMenu} className={`${styles.menu} ${styles.modoMenu}`}>
              <summary className={styles.bruPill} title="Modo da análise"><IconeBru tamanho={18}/><span>Cleo</span><span className={styles.modoAtual}>{MODOS[modo].curto}</span><Icone nome="baixo" tamanho={10}/></summary>
              <div role="menu" aria-label="Modo da análise">
                <span className={styles.modoTitulo}>Selecionar modo<small>Como a Cleo analisa este vídeo</small></span>
                {(Object.keys(MODOS) as Modo[]).map((m) => <button key={m} type="button" role="menuitemradio" aria-checked={m === modo} disabled={indisponivel} onClick={() => trocarModo(m)}>
                  <span>{MODOS[m].nome}</span>{m === modo && <Icone nome="check" tamanho={15}/>}
                </button>)}
              </div>
            </details>
            <details className={styles.menu}><summary aria-label="Mais opções" title="Mais opções"><Icone nome="mais_h" tamanho={18}/></summary><div><button type="button" onClick={(e) => {abrirSalvar("video");e.currentTarget.closest("details")?.removeAttribute("open");}}><Icone nome="salvo" tamanho={14}/>Salvar vídeo</button><a href={v.url_original} target="_blank" rel="noopener noreferrer"><Icone nome="abrir" tamanho={14}/>Abrir original</a></div></details>
            <button type="submit" className={styles.enviar} disabled={!texto.trim() || indisponivel} aria-label={respondendo ? "Cleo está respondendo" : "Enviar mensagem"}>{respondendo ? <i className={styles.spinner} aria-hidden="true"/> : <Icone nome="cima" tamanho={19}/>}</button>
          </div>
        </form>
        <p className={styles.rodape}>A Cleo pode errar. Confira as informações.</p>
      </div>
    </section>
    <aside id={`${painelId}-previa`} className={`${styles.previa} ${videoAberto ? styles.previaAberta : ""}`} aria-label="Vídeo e contexto da análise">
      <div className={styles.previaTopo}><span>Prévia do vídeo</span><button className={styles.fecharVideo} onClick={() => setVideoAberto(false)} aria-label="Fechar vídeo"><Icone nome="x" tamanho={16}/></button></div>
      <div className={styles.palcoVideo}><MolduraCelular><PlayerVideo v={v} tocar={false}/></MolduraCelular></div>
      <a className={styles.original} href={v.url_original} target="_blank" rel="noopener noreferrer">Abrir no {PLATAFORMA[v.fonte] ?? v.fonte}<Icone nome="diagonal" tamanho={12}/></a>
      <div id={`${painelId}-contexto`} className={styles.contexto} hidden={!contextoAberto}>
        <h2>{titulo}</h2><p className={styles.autor}>{v.autor_nome || v.autor || "Criador"} · {PLATAFORMA[v.fonte] ?? v.fonte}</p>
        <AbasPilula rotulo="Contexto do vídeo" valor={lado} mudar={setLado} opcoes={[["contexto","Sobre o vídeo"],["numeros","Números"]]}/>
        {lado === "numeros" ? <NumerosVideo v={v}/> : <div className="ac-contexto"><h3>Legenda original</h3><p>{v.texto_completo || "Este vídeo não tem legenda disponível."}</p><span className="ac-transcricao"><Icone nome={v.transcrito ? "check" : "fala"} tamanho={13}/>{v.transcrito ? "Transcrição disponível para a Cleo" : "Sem transcrição disponível"}</span>{anterior?.momentos?.length ? <><h3>O que sustenta a análise</h3>{anterior.momentos.map((m) => <div className="ac-evidencia" key={m.titulo}><b>{m.titulo}</b><p>{m.texto}</p></div>)}</> : null}</div>}
      </div>
    </aside>
    {salvando && <SalvarEm tipo={tipoSalvar} id={v.id} fechar={() => setSalvando(false)} aoMudar={tipoSalvar === "analise" ? (salva) => {setSalvaAgora(salva);atualizarPastasAnalise();} : undefined}/>}
  </div>;
}
