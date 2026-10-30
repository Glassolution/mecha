"use client";

import { forwardRef } from "react";

/** Mascote oficial da Bru, usando a imagem da marca. */
export const MarcaSvg = forwardRef<SVGSVGElement, { tamanho?: number; animada?: boolean; className?: string }>(
  function MarcaSvg({ tamanho = 32, animada = false, className }, ref) {
    return (
      <svg
        ref={ref}
        width={tamanho}
        height={tamanho}
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={[className, animada ? "marca-viva" : ""].filter(Boolean).join(" ")}
        style={{ borderRadius: "22%", overflow: "hidden" }}
      >
        <image href="/marca/bru.png" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
      </svg>
    );
  },
);
