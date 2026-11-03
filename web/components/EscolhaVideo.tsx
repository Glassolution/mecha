"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { rotaAssistir, rotaAnalisar } from "@/lib/navegacaoVideo";
import { Icone } from "./Icone";

/** Rotas das duas telas de um vídeo. */
export { rotaAssistir, rotaAnalisar } from "@/lib/navegacaoVideo";

/** Os dois botões que aparecem sobre a capa clicada: assistir o vídeo ou pedir a análise da Cleo. */
export function EscolhaVideo({ id, fechar, origem }: { id: string; fechar: () => void; origem?: string }) {
  const pathname = usePathname();
  const lista = origem ?? pathname;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("a")?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    const fora = (e: MouseEvent) => !ref.current?.parentElement?.contains(e.target as Node) && fechar();
    document.addEventListener("keydown", esc);
    document.addEventListener("mousedown", fora);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("mousedown", fora);
    };
  }, [fechar]);

  return (
    <div className="escolha-video" ref={ref} role="group" aria-label="O que fazer com este vídeo">
      <Link href={rotaAssistir(id, lista)} className="escolha-bt">
        <Icone nome="play" tamanho={15} /> Assistir
      </Link>
      <Link href={rotaAnalisar(id, lista)} className="escolha-bt principal">
        <Icone nome="analise" tamanho={16} /> Analisar
      </Link>
    </div>
  );
}
