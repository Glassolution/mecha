"use client";

import { forwardRef, useId } from "react";

/**
 * Marca da mecha: a nuvem segurando uma lupa sobre um olho, sem fundo e sem pés.
 * Desenho próprio (docs/decisoes.md, item 18). É o mesmo de web/marca/gerar.py (que gera os PNGs);
 * aqui fica em SVG para poder animar. Cores pelas variáveis --destaque* de globals.css.
 */
export const MarcaSvg = forwardRef<SVGSVGElement, { tamanho?: number; animada?: boolean; className?: string }>(
  function MarcaSvg({ tamanho = 32, animada = false, className }, ref) {
    const uid = useId().replace(/:/g, "");
    const corpo = `corpo-${uid}`;
    const suave = `suave-${uid}`;
    const brilho = `brilho-${uid}`;
    return (
      <svg
        ref={ref}
        width={tamanho}
        height={tamanho}
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={[className, animada ? "marca-viva" : ""].filter(Boolean).join(" ")}
      >
        <defs>
          <radialGradient id={corpo} cx="38%" cy="28%" r="85%">
            <stop offset="0%" style={{ stopColor: "var(--destaque-luz)" }} />
            <stop offset="100%" style={{ stopColor: "color-mix(in srgb, var(--destaque) 82%, var(--bg))" }} />
          </radialGradient>
          <filter id={suave} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <linearGradient id={brilho} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: "var(--ink)", stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        <g transform="translate(0 4)">
          {/* traços de "achei!" */}
          <g className="marca-tracos" strokeLinecap="round" strokeWidth="4.2" style={{ stroke: "var(--destaque)" }}>
            <path d="M12 31 L19 34.5" />
            <path d="M17.5 21.5 L22.5 27.5" />
            <path d="M27.5 15.5 L29 23" />
          </g>

          <g className="marca-corpo">
            <g filter={`url(#${suave})`} style={{ fill: `url(#${corpo})` }}>
              <circle cx="44" cy="58" r="16" />
              <circle cx="60" cy="44" r="20" />
              <circle cx="76" cy="58" r="15" />
              <rect x="28" y="54" width="62" height="22" rx="11" />
            </g>
            <path className="marca-piscada" d="M67 48 q5.5 -4.5 11 0" fill="none" strokeWidth="3.2" strokeLinecap="round" style={{ stroke: "var(--bg)" }} />
          </g>

          <g className="marca-lupa">
            <path d="M31 61 L18 76" strokeLinecap="round" strokeWidth="8" style={{ stroke: "var(--bg)" }} />
            <path d="M31 61 L18 76" strokeLinecap="round" strokeWidth="3.6" style={{ stroke: "var(--destaque)" }} />
            <circle cx="26" cy="67" r="6.2" filter={`url(#${suave})`} style={{ fill: `url(#${corpo})` }} />
            <circle cx="42" cy="46" r="17.5" style={{ fill: "var(--bg)" }} />
            <circle cx="42" cy="46" r="15" style={{ fill: "var(--destaque)" }} />
            <circle cx="42" cy="46" r="11.6" style={{ fill: "var(--vidro-lupa)" }} />
            <g className="marca-olho">
              <ellipse cx="43" cy="46.5" rx="5.6" ry="8" style={{ fill: "var(--bg)" }} />
              <ellipse cx="41.2" cy="43" rx="1.7" ry="2.3" style={{ fill: "var(--ink)" }} />
            </g>
            <path className="marca-reflexo" d="M33.5 40 a10 10 0 0 1 6 -6" fill="none" strokeWidth="2.2" strokeLinecap="round" style={{ stroke: `url(#${brilho})` }} />
          </g>
        </g>
      </svg>
    );
  },
);
