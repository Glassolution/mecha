"use client";

import { useEffect, useState } from "react";
import { Mascote } from "./Mascote";

// Repertório do mascote nas telas de entrada: uma ação por vez, em ordem aleatória, sem repetir a anterior.
const ACOES = ["pulinho", "inspeciona", "procura", "achei", "cambalhota", "espia", "aceno", "danca"] as const;
type Acao = (typeof ACOES)[number];

export type ModoMascote = "normal" | "lendo" | "tapando" | "espiando";

/**
 * O mascote "atuando": entre uma ação e outra fica respirando; reage ao que a pessoa faz
 * (lendo enquanto digita, tapando o olho na senha, espiando quando a senha é mostrada) e
 * comemora quando `comemora` muda.
 */
export function MascoteAtor({ tamanho = 76, modo = "normal", comemora = 0 }: { tamanho?: number; modo?: ModoMascote; comemora?: number }) {
  const [acao, setAcao] = useState<{ nome: Acao; vez: number } | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    let anterior: Acao | null = null;
    const proxima = (espera: number) => {
      t = setTimeout(() => {
        const opcoes = ACOES.filter((a) => a !== anterior);
        const nome = opcoes[Math.floor(Math.random() * opcoes.length)];
        anterior = nome;
        setAcao({ nome, vez: Date.now() });
        proxima(2600 + Math.random() * 2600);
      }, espera);
    };
    proxima(900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!comemora) return;
    const t = setTimeout(() => setAcao({ nome: "achei", vez: Date.now() }), 0);
    return () => clearTimeout(t);
  }, [comemora]);

  const classe = modo !== "normal" ? `modo-${modo}` : acao ? `acao-${acao.nome}` : "";
  return (
    <div className="ator" aria-hidden="true">
      {/* a key reinicia a animação a cada ação nova */}
      <div key={modo !== "normal" ? modo : acao?.vez ?? 0} className={`ator-palco ${classe}`}>
        <Mascote tamanho={tamanho} />
      </div>
    </div>
  );
}
