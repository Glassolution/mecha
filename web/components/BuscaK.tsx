"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { capaUrl, num } from "@/lib/fmt";
import type { Video } from "@/lib/tipos";
import { primeiraLinha } from "./Cartoes";
import { Icone } from "./Icone";

type Resultado = {
  videos: Video[];
  ideias: { id: string; titulo_pt: string; nicho_rotulo: string; exemplo: boolean }[];
  colecoes: { id: string; nome: string }[];
};

export function BuscaK({ fechar }: { fechar: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resBruto, setRes] = useState<Resultado | null>(null);
  const [sel, setSel] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        setRes(await api<Resultado>(`/api/busca?q=${encodeURIComponent(q.trim())}`));
        setSel(0);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const res = q.trim().length >= 2 ? resBruto : null;
  const itens: { href: string; rotulo: React.ReactNode }[] = [
    ...(res?.ideias ?? []).map((i) => ({
      href: `/ideia/${i.id}`,
      rotulo: (
        <>
          <Icone nome="ideia" />
          <span style={{ flex: 1 }}>{i.titulo_pt}</span>
          {i.exemplo && <span className="selo selo-exemplo">Exemplo</span>}
        </>
      ),
    })),
    ...(res?.videos ?? []).map((v) => ({
      href: `/video/${encodeURIComponent(v.id)}`,
      rotulo: (
        <>
          {v.capa ? <img src={capaUrl(v.capa)!} alt="" width={28} height={40} style={{ borderRadius: 6, objectFit: "cover" }} /> : <Icone nome="play" />}
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primeiraLinha(v.texto)}</span>
          <span className="mono fraco" style={{ fontSize: 12 }}>{num(v.views)}</span>
        </>
      ),
    })),
    ...(res?.colecoes ?? []).map((c) => ({
      href: `/salvos/${c.id}`,
      rotulo: (
        <>
          <Icone nome="salvo" /> <span>{c.nome}</span>
        </>
      ),
    })),
  ];

  function ir(href: string) {
    fechar();
    router.push(href);
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, itens.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && itens[sel]) {
      ir(itens[sel].href);
    }
  }

  let n = -1;
  const grupo = (titulo: string, quantos: number) => (quantos ? <div className="janela-grupo">{titulo}</div> : null);

  return (
    <div className="fundo-janela" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="janela janela-busca" role="dialog" aria-label="Buscar">
        <input
          ref={campo}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={tecla}
          placeholder="Buscar ideia, SaaS ou nicho"
          aria-label="Buscar ideia, SaaS ou nicho"
        />
        <div className="janela-lista" role="listbox">
          {!res && <p className="fraco" style={{ padding: 14 }}>Escreva pelo menos 2 letras. Busca nas ideias, nos vídeos e nas suas coleções.</p>}
          {res && itens.length === 0 && <p className="fraco" style={{ padding: 14 }}>Nada encontrado para “{q}”. Que tal garimpar essa palavra?</p>}
          {grupo("Ideias", res?.ideias.length ?? 0)}
          {itens.slice(0, res?.ideias.length ?? 0).map((it) => {
            n++;
            const k = n;
            return (
              <button key={it.href} className="janela-item" role="option" aria-selected={sel === k} onMouseEnter={() => setSel(k)} onClick={() => ir(it.href)}>
                {it.rotulo}
              </button>
            );
          })}
          {grupo("Vídeos", res?.videos.length ?? 0)}
          {itens.slice(res?.ideias.length ?? 0, (res?.ideias.length ?? 0) + (res?.videos.length ?? 0)).map((it) => {
            n++;
            const k = n;
            return (
              <button key={it.href} className="janela-item" role="option" aria-selected={sel === k} onMouseEnter={() => setSel(k)} onClick={() => ir(it.href)}>
                {it.rotulo}
              </button>
            );
          })}
          {grupo("Coleções", res?.colecoes.length ?? 0)}
          {itens.slice((res?.ideias.length ?? 0) + (res?.videos.length ?? 0)).map((it) => {
            n++;
            const k = n;
            return (
              <button key={it.href} className="janela-item" role="option" aria-selected={sel === k} onMouseEnter={() => setSel(k)} onClick={() => ir(it.href)}>
                {it.rotulo}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
