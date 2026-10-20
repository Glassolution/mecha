"use client";

import { useEffect, useState } from "react";
import { num } from "@/lib/fmt";
import { Icone } from "./Icone";

function porcentagem(x: number) {
  const casas = x < 0.01 ? 2 : x < 0.1 ? 1 : 0;
  return `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
}

/** Número que sobe até o valor, com a unidade ("mil", "mi", "%") menor e mais clara. */
function Valor({ n, tipo = "num" }: { n: number | null; tipo?: "num" | "pct" }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (n === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const r = setTimeout(() => setT(1), 0);
      return () => clearTimeout(r);
    }
    const inicio = performance.now();
    let q = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / 1000);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) q = requestAnimationFrame(passo);
    };
    q = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(q);
  }, [n]);
  if (n === null) return <span className="dv-valor">—</span>;
  const texto = tipo === "pct" ? porcentagem(n * t) : num(Math.round(n * t));
  const m = texto.match(/^([\d.,]+)\s*(mil|mi|%)?$/);
  return (
    <span className="dv-valor">
      {m ? m[1] : texto}
      {m?.[2] && <span className="dv-unidade">{m[2] === "%" ? "%" : ` ${m[2]}`}</span>}
    </span>
  );
}

type Props = {
  views: number | null;
  viewsDia: number | null;
  likes: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
  publicado: string | null;
};

/** O bloco de desempenho do vídeo: 3 números principais e de que é feito o engajamento. */
export function Desempenho({ views, viewsDia, likes, comentarios, compartilhamentos, salvamentos, publicado }: Props) {
  const partes = [
    { k: "Curtidas", icone: "coracao", n: likes ?? 0 },
    { k: "Comentários", icone: "fala", n: comentarios ?? 0 },
    { k: "Compartilhados", icone: "compartilhar", n: compartilhamentos ?? 0 },
    { k: "Salvamentos", icone: "salvo", n: salvamentos ?? 0 },
  ];
  const interacoes = partes.reduce((s, p) => s + p.n, 0);
  const engajamento = views ? interacoes / views : null;
  const [agora] = useState(() => Date.now());
  const dias = publicado ? Math.max(1, Math.floor((agora - new Date(publicado).getTime()) / 86_400_000)) : null;
  const anel = 2 * Math.PI * 8;

  return (
    <div className="dv">
      <div className="dv-topo">
        <div className="dv-metrica">
          <span className="dv-rotulo">Views</span>
          <Valor n={views} />
          <span className="dv-contexto">{dias ? `em ${dias} ${dias === 1 ? "dia" : "dias"}` : "no total"}</span>
        </div>
        <div className="dv-metrica">
          <span className="dv-rotulo">Por dia</span>
          <Valor n={viewsDia} />
          <span className="dv-contexto">média desde a postagem</span>
        </div>
        <div className="dv-metrica">
          <span className="dv-rotulo">Engajamento</span>
          <span className="dv-linha">
            <Valor n={engajamento} tipo="pct" />
            {engajamento !== null && (
              <svg className="dv-anel" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <circle cx="11" cy="11" r="8" style={{ strokeDasharray: anel, strokeDashoffset: anel * (1 - Math.min(1, engajamento)) }} />
              </svg>
            )}
          </span>
          <span className="dv-contexto">interações ÷ views</span>
        </div>
      </div>

      {interacoes > 0 && (
        <>
          <div className="dv-barra" role="img" aria-label="Divisão das interações">
            {partes.map((p, i) => (
              <span key={p.k} className={`dv-seg s${i}`} style={{ flexGrow: p.n, animationDelay: `${0.25 + i * 0.08}s` }} />
            ))}
          </div>
          <ul className="dv-partes">
            {partes.map((p, i) => (
              <li key={p.k}>
                <span className="dv-icone"><Icone nome={p.icone} tamanho={15} /></span>
                <span className="dv-parte-txt">
                  <b>{num(p.n)}</b>
                  <span><i className={`dv-ponto s${i}`} aria-hidden="true" />{p.k}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
