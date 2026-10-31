"use client";

import { useState, type PointerEvent } from "react";
import { Pose } from "./Pose";

/** Uma chegada com peso e um cumprimento sob demanda, sem movimento em loop. */
export function MascoteBoasVindas() {
  const [cumprimento, setCumprimento] = useState(0);

  function acompanhar(evento: PointerEvent<HTMLButtonElement>) {
    if (evento.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const botao = evento.currentTarget;
    const caixa = botao.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width - 0.5;
    const y = (evento.clientY - caixa.top) / caixa.height - 0.5;
    botao.style.setProperty("--bru-x", `${x * 5}px`);
    botao.style.setProperty("--bru-y", `${y * 3}px`);
    botao.style.setProperty("--bru-giro", `${x * 7}deg`);
  }

  function repousar(evento: PointerEvent<HTMLButtonElement>) {
    for (const propriedade of ["--bru-x", "--bru-y", "--bru-giro"]) evento.currentTarget.style.removeProperty(propriedade);
  }

  return (
    <button type="button" className="boas-bru" aria-label="Cumprimentar a Wae" onPointerMove={acompanhar} onPointerLeave={repousar} onClick={() => setCumprimento((vez) => vez + 1)}>
      <span key={cumprimento} className={`boas-bru-cena ${cumprimento ? "cumprimenta" : "chega"}`} aria-hidden="true">
        <span className="boas-bru-sombra" />
        <span className="boas-bru-inclina">
          <span className="boas-bru-gesto"><Pose nome="boas-vindas" largura={112} className="boas-marca" /></span>
        </span>
        <span className="boas-bru-acento" />
      </span>
    </button>
  );
}
