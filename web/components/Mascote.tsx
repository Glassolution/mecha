"use client";

import { useEffect, useRef } from "react";
import { MarcaSvg } from "./Marca";

/** A marca, viva: a pupila dentro da lupa segue o mouse, a lupa procura e o reflexo passa pelo vidro. */
export function Mascote({ tamanho = 88 }: { tamanho?: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect();
        // centro da lente fica em (44, 47) do desenho de 100 x 100
        const dx = e.clientX - (r.left + r.width * 0.44);
        const dy = e.clientY - (r.top + r.height * 0.47);
        const dist = Math.hypot(dx, dy) || 1;
        const forca = Math.min(1, dist / 380);
        svg.style.setProperty("--ox", `${(dx / dist) * 2.6 * forca}px`);
        svg.style.setProperty("--oy", `${(dy / dist) * 3.4 * forca}px`);
      });
    };
    window.addEventListener("pointermove", mover);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", mover);
    };
  }, []);

  return <MarcaSvg ref={ref} tamanho={tamanho} animada className="mascote" />;
}
