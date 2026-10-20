"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { capaUrl, num } from "@/lib/fmt";
import type { Video } from "@/lib/tipos";
import { primeiraLinha } from "./Cartoes";

const FILEIRAS = 3;
const POR_FILEIRA = 10;
const TROCA_MS = 90_000; // a cada 1 min 30 s as três fileiras trocam de vídeos
// sentido e velocidade de cada fileira (segundos por volta)
const RITMO: { sentido: "esquerda" | "direita"; segundos: number }[] = [
  { sentido: "esquerda", segundos: 80 },
  { sentido: "direita", segundos: 95 },
  { sentido: "esquerda", segundos: 70 },
];

/** Os vídeos de uma fileira nesta rodada: fatias diferentes da lista de em alta, que andam a cada troca. */
function fatia(lista: Video[], fileira: number, rodada: number): Video[] {
  if (!lista.length) return [];
  const inicio = (fileira * POR_FILEIRA + rodada * FILEIRAS * POR_FILEIRA) % lista.length;
  return Array.from({ length: Math.min(POR_FILEIRA, lista.length) }, (_, i) => lista[(inicio + i) % lista.length]);
}

/** Três faixas de capas em alta, em sentidos diferentes, que trocam de vídeos de tempos em tempos. */
export function Esteiras({ videos }: { videos: Video[] }) {
  const lista = videos.filter((v) => v.capa);
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (lista.length <= POR_FILEIRA) return;
    const t = setInterval(() => {
      if (!document.hidden) setRodada((r) => r + 1);
    }, TROCA_MS);
    return () => clearInterval(t);
  }, [lista.length]);

  if (lista.length < 6) return null;

  return (
    <section className="ini-esteira" id="em-alta" aria-label="Em alta agora">
      <div className="ini-esteira-topo">
        <span>Em alta agora</span>
      </div>
      <div className="esteiras">
        {RITMO.map((r, f) => {
          const itens = fatia(lista, f, rodada);
          return (
            <div key={f} className="ini-esteira-janela">
              {/* key muda a cada rodada: a fileira nova entra com transição suave */}
              <div
                key={rodada}
                className={`ini-esteira-trilho ${r.sentido}`}
                style={{ animationDuration: `${r.segundos}s, 1.2s`, "--atraso": `${f * 0.15}s` } as React.CSSProperties}
              >
                {[...itens, ...itens].map((v, n) => (
                  <Link
                    key={`${v.id}-${n}`}
                    href={`/video/${encodeURIComponent(v.id)}`}
                    className="ini-capa"
                    tabIndex={n >= itens.length ? -1 : 0}
                    aria-hidden={n >= itens.length}
                  >
                    <img src={capaUrl(v.capa)!} alt="" loading="lazy" />
                    <span className="ini-capa-info">
                      <b>{primeiraLinha(v.texto)}</b>
                      <span>{num(v.views)} views{v.views_dia ? ` · ${num(v.views_dia)}/dia` : ""}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
