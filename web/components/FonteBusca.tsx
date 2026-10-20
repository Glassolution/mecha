"use client";

import { useEffect, useRef, useState } from "react";
import type { EscolhaFonte } from "@/lib/fontes";
import { Icone } from "./Icone";

export type OpcaoCompacta<T extends string> = { id: T; nome: string; curto: string; detalhe: string; icones: string[] };

/** Botão pequeno (ícones + nome curto + seta) que abre um menu de escolha única com uma explicação por opção. */
export function SeletorCompacto<T extends string>({ rotulo, opcoes, valor, mudar }: { rotulo: string; opcoes: OpcaoCompacta<T>[]; valor: T; mudar: (v: T) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  const atual = opcoes.find((o) => o.id === valor) ?? opcoes[0];

  return (
    <div className="fonte-busca" ref={ref}>
      <button type="button" className="fonte-busca-bt" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
        aria-label={`${rotulo}: ${atual.nome}`}>
        <span className="fonte-busca-icones">{atual.icones.map((i) => <Icone key={i} nome={i} tamanho={14} />)}</span>
        <span className="fonte-busca-nome">{atual.curto}</span>
        <Icone nome="baixo" tamanho={14} />
      </button>
      {aberto && (
        <div className="fonte-busca-menu" role="menu" aria-label={rotulo}>
          {opcoes.map((o) => (
            <button key={o.id} type="button" role="menuitemradio" aria-checked={o.id === valor} className="fonte-busca-item"
              onClick={() => { mudar(o.id); setAberto(false); }}>
              <span className="fonte-busca-icones">{o.icones.map((i) => <Icone key={i} nome={i} tamanho={15} />)}</span>
              <span><b>{o.nome}</b><span>{o.detalhe}</span></span>
              {o.id === valor && <Icone nome="check" tamanho={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FONTES: OpcaoCompacta<EscolhaFonte>[] = [
  { id: "todas", nome: "Todas as fontes", curto: "Todas", detalhe: "TikTok e Instagram", icones: ["tiktok", "instagram"] },
  { id: "tiktok", nome: "Só TikTok", curto: "TikTok", detalhe: "Mais barato e com a fala do vídeo", icones: ["tiktok"] },
  { id: "instagram", nome: "Só Instagram", curto: "Instagram", detalhe: "Reels do último ano", icones: ["instagram"] },
];

/** Onde garimpar: todas as fontes, só TikTok ou só Instagram (na caixa de busca do Início). */
export function FonteBusca({ valor, mudar }: { valor: EscolhaFonte; mudar: (v: EscolhaFonte) => void }) {
  return <SeletorCompacto rotulo="Onde garimpar" opcoes={FONTES} valor={valor} mudar={mudar} />;
}
