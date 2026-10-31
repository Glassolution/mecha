"use client";

import { useId, useState } from "react";
import type { EstadoFonte } from "@/lib/tipos";
import { Icone } from "./Icone";
import { Pose } from "./Pose";
import styles from "./EstadoBusca.module.css";

const FERRAMENTAS: Record<string, { nome: string; icone: string }> = {
  tiktok: { nome: "TikTok", icone: "tiktok" },
  instagram: { nome: "Instagram", icone: "instagram" },
  youtube: { nome: "YouTube Shorts", icone: "youtube" },
  tiktok_ads: { nome: "TikTok Ads", icone: "tiktok" },
  meta_ads: { nome: "Meta Ads", icone: "anuncio" },
};

function ferramenta(fonte: string) {
  return FERRAMENTAS[fonte] ?? { nome: fonte, icone: "globo" };
}

function duracao(segundos: number) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function videos(n: number) { return `${n} ${n === 1 ? "vídeo" : "vídeos"}`; }

/** As ferramentas são as selecionadas no garimpo; o destaque segue o estado recebido por SSE. */
export function FerramentasPesquisa({ fontes, ativo }: { fontes: EstadoFonte[]; ativo: boolean }) {
  return <span className="res-ferramentas" role="list" aria-label="Ferramentas selecionadas">
    {fontes.map((fonte) => {
      const { nome, icone } = ferramenta(fonte.fonte);
      const usando = ativo && fonte.status === "buscando";
      const rotulo = `${nome}${usando ? " em uso" : fonte.status === "pronto" ? " concluído" : " selecionado"}`;
      return <span role="listitem" key={fonte.fonte} aria-label={rotulo} className={`res-ferramenta${usando ? " ativa" : ""}${fonte.status === "pronto" ? " pronta" : ""}`} title={rotulo}>
        <Icone nome={icone} tamanho={12}/><span>{nome}</span>{usando ? <i aria-hidden="true"/> : fonte.status === "pronto" ? <Icone nome="check" tamanho={10}/> : null}
      </span>;
    })}
  </span>;
}

type Props = {
  estado: "buscando" | "concluido" | "parado" | "erro";
  termo: string | null; quantos: number; transcritos: number; segundos: number;
  atividade?: string | null; fontes?: EstadoFonte[]; aguardando?: boolean;
  detalhe?: string | null; parando?: boolean; aoParar?: () => void;
  compacto?: boolean;
};

/** O painel acompanha eventos reais da pesquisa, sem simular porcentagens por tempo. */
export function EstadoBusca({ estado, termo, quantos, transcritos, segundos, atividade, fontes = [], aguardando, detalhe, parando, aoParar, compacto }: Props) {
  const [expandido, setExpandido] = useState(false);
  const id = useId();
  const ativo = estado === "buscando";
  const atual = fontes.find((f) => f.status === "buscando");
  const finalizadas = fontes.filter((f) => ["pronto", "erro", "trancada", "parado"].includes(f.status)).length;
  const falhas = fontes.filter((f) => ["erro", "trancada"].includes(f.status)).length;
  const redesConcluidas = fontes.filter((f) => f.status === "pronto").map((f) => ferramenta(f.fonte).nome).join(" e ");
  const rotulo = parando ? "Encerrando a pesquisa" : aguardando ? "Preparando sua pesquisa" : "Pesquisando seus vídeos";
  const tituloFinal = estado === "erro" ? "Não foi possível concluir a pesquisa" : estado === "parado" ? "Pesquisa encerrada" : `${videos(quantos)} ${quantos === 1 ? "encontrado" : "encontrados"}`;
  const textoFinal = estado === "erro" ? detalhe || "Tente novamente em um instante."
    : quantos ? `${redesConcluidas || "Vídeos prontos para explorar"}${transcritos ? ` · ${videos(transcritos)} com fala captada` : ""}${falhas ? ` · ${falhas === 1 ? "Uma fonte não respondeu" : "Algumas fontes não responderam"}` : ""}`
    : estado === "parado" ? "Nenhum vídeo havia chegado ainda." : "Experimente outras palavras para encontrar vídeos.";

  const painel = <div className={`${styles.painel} ${compacto ? styles.compacto : ""}`}>
    <div className={styles.topo}>
      <span className={styles.rotulo}>{ativo && <i aria-hidden="true" />}{ativo ? rotulo : "Detalhes da pesquisa"}</span>
      <time className={styles.tempo} aria-label={`Tempo da pesquisa: ${duracao(segundos)}`}>{duracao(segundos)}</time>
      {ativo && aoParar && <button type="button" className={styles.parar} onClick={aoParar} disabled={parando}><Icone nome="parar" tamanho={10} />{parando ? "Encerrando…" : "Parar"}</button>}
    </div>
    <ul className={styles.lista} aria-label="Andamento por rede">
      {fontes.map((fonte) => {
        const { nome, icone } = ferramenta(fonte.fonte);
        const pronta = fonte.status === "pronto";
        const falhou = ["erro", "trancada"].includes(fonte.status);
        const usando = ativo && !parando && fonte.status === "buscando";
        const fase = fonte.etapa;
        const titulo = usando ? fase === "organizando" ? `Organizando vídeos do ${nome}` : fase === "cache" ? `Recuperando vídeos do ${nome}` : fase === "preparando" ? `Preparando o ${nome}` : `Pesquisando no ${nome}` : nome;
        const descricao = falhou ? fonte.detalhe || "Esta rede não respondeu. Você pode tentar novamente."
          : pronta ? `${videos(fonte.novos ?? 0)} ${fonte.novos === 1 ? "encontrado" : "encontrados"}`
          : parando && ativo ? "Finalizando a consulta…"
          : usando ? fase === "organizando" ? "Preparando os resultados para você." : fase === "cache" ? "Carregando os resultados da pesquisa recente." : fase === "preparando" ? "Conectando à rede para começar a busca." : (fonte.termo || termo) ? `Buscando vídeos sobre “${fonte.termo || termo}”` : "Buscando os primeiros vídeos…"
          : ativo ? aguardando ? "Aguardando o início da pesquisa." : "Aguardando sua vez na pesquisa."
          : "Consulta encerrada.";
        return <li key={fonte.fonte} className={`${styles.linha} ${usando ? styles.ativa : pronta ? styles.pronta : falhou ? styles.falhou : ""}`}>
          <span className={styles.icone} aria-hidden="true"><Icone nome={icone} tamanho={19} /></span>
          <div className={styles.texto}><h3>{titulo}</h3><p>{descricao}</p></div>
          <span className={styles.sinal} aria-label={usando ? "Carregando" : pronta ? "Concluído" : falhou ? "Indisponível" : ativo ? "Na fila" : "Encerrado"}>
            {usando ? <i className={styles.spinner} aria-hidden="true" /> : pronta ? <Icone nome="check" tamanho={16} /> : falhou ? <Icone nome="x" tamanho={14} /> : <i className={styles.pendente} aria-hidden="true" />}
          </span>
        </li>;
      })}
    </ul>
    {!fontes.length && <div className={styles.aviso}>{ativo && <i className={styles.spinner} aria-hidden="true" />}<div className={styles.texto}><h3>{ativo ? "Preparando sua pesquisa" : "Sem atividade registrada"}</h3><p>{ativo ? "Os vídeos vão aparecer aqui assim que chegarem." : "Confira o resumo da pesquisa acima."}</p></div></div>}
    <div className={styles.pe}>
      <div className={styles.informacoes}><span>{quantos ? `${videos(quantos)} ${quantos === 1 ? "encontrado" : "encontrados"}` : ativo ? "Aguardando os primeiros vídeos" : "Nenhum vídeo encontrado"}</span>{fontes.length > 0 && <span>{finalizadas} de {fontes.length} {fontes.length === 1 ? "fonte finalizada" : "fontes finalizadas"}</span>}</div>
      <div className={`${styles.trilho} ${ativo ? styles.carregando : ""}`} role="progressbar" aria-label="Progresso da pesquisa" aria-valuemin={0} aria-valuemax={Math.max(1, fontes.length)} aria-valuenow={finalizadas} aria-valuetext={`${finalizadas} de ${fontes.length} fontes finalizadas`}><span className={styles.progresso} style={{ width: `${fontes.length ? finalizadas / fontes.length * 100 : 0}%` }} /></div>
    </div>
  </div>;

  if (ativo && compacto) return <section aria-label="Andamento da pesquisa">
    <div className={styles.linhaCompacta}>
      <span className={styles.mascoteCompacto} aria-hidden="true"><Pose nome="pesquisando" largura={42} /></span>
      <div className={styles.contextoCompacto}><span className={styles.sobreTitulo}>BRU ESTÁ PESQUISANDO</span><span className={styles.situacaoCompacta} role="status"><i className={styles.spinner} aria-hidden="true" />{parando ? "Encerrando a pesquisa…" : aguardando ? "Preparando sua pesquisa…" : atual ? `Pesquisando no ${ferramenta(atual.fonte).nome}…` : rotulo}</span></div>
      <span className={styles.contagemCompacta}>{videos(quantos)} {quantos === 1 ? "encontrado" : "encontrados"}</span>
      <time className={styles.tempo} aria-label={`Tempo da pesquisa: ${duracao(segundos)}`}>{duracao(segundos)}</time>
      {aoParar && <button type="button" className={styles.parar} onClick={aoParar} disabled={parando}>{parando ? "Encerrando…" : "Parar"}</button>}
      <button type="button" className={styles.detalhes} aria-controls={id} aria-expanded={expandido} onClick={() => setExpandido(!expandido)}>{expandido ? "Ocultar atividade" : "Ver atividade"}<Icone nome="baixo" tamanho={12} className={expandido ? styles.aberto : undefined} /></button>
    </div>
    <div id={id} className={styles.historico} hidden={!expandido}>{expandido && painel}</div>
  </section>;

  if (ativo) return <section aria-label="Andamento da pesquisa"><h2 className="oculto">{rotulo}</h2>{painel}<p className="oculto" role="status">{parando ? "Encerrando a pesquisa" : aguardando ? "Preparando sua pesquisa" : atual ? `Pesquisando no ${ferramenta(atual.fonte).nome}` : atividade || "Pesquisando vídeos"}. {videos(quantos)} encontrados.</p></section>;

  return <section aria-label="Andamento da pesquisa">
    <div className={`${styles.resumo} ${estado === "erro" ? styles.terminalErro : styles.terminalPronto}`}>
      <span className={styles.mascoteResultado} aria-hidden="true"><Pose nome="pesquisando" largura={62} /><span className={styles.seloResultado}><Icone nome={estado === "erro" ? "x" : estado === "parado" ? "parar" : "check"} tamanho={10} /></span></span>
      <div className={styles.finalTexto} role="status"><span className={styles.sobreTitulo}>RESULTADOS DA PESQUISA</span><h1>{tituloFinal}</h1><p>{textoFinal}</p></div>
      <span className={styles.conclusao}>{estado === "concluido" ? <><i />Pesquisa concluída</> : estado === "parado" ? "Encerrada" : "Interrompida"}</span>
      <button type="button" className={styles.detalhes} aria-controls={id} aria-expanded={expandido} onClick={() => setExpandido(!expandido)}>{expandido ? "Ocultar detalhes" : "Ver detalhes"}<Icone nome="baixo" tamanho={12} className={expandido ? styles.aberto : undefined} /></button>
    </div>
    <div id={id} className={styles.historico} hidden={!expandido}>{expandido && painel}</div>
  </section>;
}
