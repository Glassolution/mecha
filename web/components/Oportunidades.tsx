"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AnaliseOportunidades } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { SeloFonte } from "@/components/SeloFonte";
import styles from "./Oportunidades.module.css";

const FORCA: Record<string, string> = { alta: "Sinal forte", media: "Sinal médio", baixa: "Sinal fraco" };
const ETAPA: Record<string, string> = {
  comentarios: "Lendo os comentários dos vídeos com mais views…",
  analise: "Procurando dores e SaaS que já existem…",
};

/** Analista de oportunidades do garimpo: aparece depois que a busca termina. */
export function Oportunidades({ garimpoId }: { garimpoId: string }) {
  const [estado, setEstado] = useState<AnaliseOportunidades | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [pedindo, setPedindo] = useState(false);
  const caminho = `/api/garimpos/${garimpoId}/oportunidades`;

  const carregar = useCallback(() => api<AnaliseOportunidades | null>(caminho).then(setEstado).catch(() => setEstado(null)), [caminho]);
  useEffect(() => { carregar(); }, [carregar]);

  // enquanto analisa, confere a cada 3 s
  const analisando = estado?.status === "analisando";
  useEffect(() => {
    if (!analisando) return;
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, [analisando, carregar]);

  async function pedir() {
    setPedindo(true);
    setErro(null);
    try {
      setEstado(await api<AnaliseOportunidades>(caminho, { method: "POST" }));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setPedindo(false);
    }
  }

  if (estado === undefined) return null;

  if (!estado || estado.status === "erro") {
    return (
      <section className={styles.convite} aria-labelledby="op-titulo">
        <span className={styles.selo}><Icone nome="alvo" tamanho={20} /></span>
        <div className={styles.conviteTexto}>
          <h2 id="op-titulo">Oportunidades</h2>
          <p>{estado?.erro ?? "Lemos os comentários dos vídeos mais vistos e apontamos as dores que viram SaaS."}</p>
          {erro && <p className={styles.erro} role="alert">{erro}</p>}
        </div>
        <button className="bt1" onClick={pedir} disabled={pedindo}>
          {estado ? <><Icone nome="refazer" tamanho={15} /> Tentar de novo</> : <><Icone nome="analise" tamanho={15} /> Analisar oportunidades</>}
        </button>
      </section>
    );
  }

  if (estado.status === "analisando" || !estado.resultado) {
    return (
      <section className={styles.convite} aria-live="polite" aria-busy="true">
        <span className={styles.spinner} aria-hidden />
        <div className={styles.conviteTexto}>
          <h2>Analisando oportunidades</h2>
          <p>{ETAPA[estado.etapa ?? ""] ?? "Preparando a análise…"} Leva de 1 a 3 minutos.</p>
        </div>
      </section>
    );
  }

  const r = estado.resultado;
  return (
    <section className={styles.painel} aria-labelledby="op-titulo">
      <header className={styles.topo}>
        <span className={styles.selo}><Icone nome="alvo" tamanho={20} /></span>
        <div>
          <h2 id="op-titulo">Oportunidades em {r.nicho}</h2>
          <p className={styles.meta}>{r.videos_lidos} vídeos e {r.comentarios_lidos} comentários lidos</p>
        </div>
      </header>
      <p className={styles.resumo}>{r.resumo}</p>

      <h3 className={styles.subtitulo}>Dores que viram SaaS</h3>
      {r.dores.length === 0 ? (
        <p className={styles.vazio}>Nenhuma dor com evidência suficiente nesta busca.</p>
      ) : (
        <ol className={styles.dores}>
          {r.dores.map((d, i) => (
            <li key={i} className={styles.dor}>
              <div className={styles.dorTopo}>
                <h4>{d.titulo}</h4>
                <span className={`${styles.forca} ${styles[d.forca_do_sinal]}`}>{FORCA[d.forca_do_sinal]}</span>
              </div>
              <p>{d.descricao}</p>
              <dl className={styles.campos}>
                <div><dt>Ideia de SaaS</dt><dd>{d.ideia_de_saas}</dd></div>
                <div><dt>Por que software</dt><dd>{d.por_que_software}</dd></div>
              </dl>
              <ul className={styles.evidencias}>
                {d.evidencias.map((ev, j) => (
                  <li key={j}>
                    <SeloFonte fonte={ev.fonte} soIcone />
                    <span>{ev.comentario ? `“${ev.comentario}”` : "Citado na legenda ou na fala do vídeo"}</span>
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir o vídeo">
                      Ver vídeo <Icone nome="diagonal" tamanho={12} />
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <h3 className={styles.subtitulo}>SaaS que já existem</h3>
      {r.saas_existentes.length === 0 ? (
        <p className={styles.vazio}>Nenhum produto confirmado na busca na web.</p>
      ) : (
        <div className={styles.saas}>
          {r.saas_existentes.map((s, i) => (
            <article key={i} className={styles.cartao}>
              <div className={styles.dorTopo}>
                <h4>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.nome} <Icone nome="diagonal" tamanho={12} /></a> : s.nome}</h4>
                {s.preco && <span className={styles.preco}>{s.preco}</span>}
              </div>
              <p>{s.o_que_faz}</p>
              <dl className={styles.campos}>
                <div><dt>Para quem</dt><dd>{s.publico}</dd></div>
                <div><dt>Lacuna</dt><dd>{s.lacuna}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <p className={styles.limitacoes}><b>Limitações:</b> {r.limitacoes}</p>
    </section>
  );
}
