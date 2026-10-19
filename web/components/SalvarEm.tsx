"use client";

import { useEffect, useRef, useState } from "react";
import { api, limparCache } from "@/lib/api";
import type { Colecao } from "@/lib/tipos";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";

/** Janela "Salvar em…": marca e desmarca coleções, ou cria uma nova. */
export function SalvarEm({ tipo, id, fechar, aoMudar }: { tipo: "video" | "ideia"; id: string; fechar: () => void; aoMudar?: (salvo: boolean) => void }) {
  const { avisar } = useApp();
  const [colecoes, setColecoes] = useState<Colecao[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [nova, setNova] = useState("");
  const fecharRef = useRef(fechar);
  useEffect(() => {
    fecharRef.current = fechar;
  }, [fechar]);

  useEffect(() => {
    (async () => {
      const [cols, onde] = await Promise.all([
        api<Colecao[]>("/api/colecoes"),
        api<string[]>(`/api/salvos/onde?item_tipo=${tipo}&item_id=${encodeURIComponent(id)}`),
      ]);
      setColecoes(cols);
      setMarcadas(new Set(onde));
    })();
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") fecharRef.current();
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [tipo, id]);

  async function alternar(c: Colecao) {
    const ja = marcadas.has(String(c.id));
    if (ja) await api(`/api/salvos/${c.id}/${tipo}/${encodeURIComponent(id)}`, { method: "DELETE" });
    else await api("/api/salvos", { method: "POST", json: { colecao_id: String(c.id), item_tipo: tipo, item_id: id } });
    const prox = new Set(marcadas);
    if (ja) prox.delete(String(c.id));
    else prox.add(String(c.id));
    setMarcadas(prox);
    setColecoes((cs) => cs?.map((x) => (x.id === c.id ? { ...x, itens: Number(x.itens) + (ja ? -1 : 1) } : x)) ?? cs);
    limparCache("/api/colecoes");
    aoMudar?.(prox.size > 0);
    avisar(ja ? `Tirado de ${c.nome}` : `Salvo em ${c.nome}`);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.trim()) return;
    const c = await api<Colecao>("/api/colecoes", { method: "POST", json: { nome: nova.trim() } });
    setNova("");
    setColecoes((cs) => [...(cs ?? []), { ...c, itens: 0, capas: [] }]);
    await alternar({ ...c, itens: 0, capas: [] });
  }

  return (
    <div className="fundo-janela" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="janela" role="dialog" aria-label="Salvar em uma coleção" style={{ maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 8px" }}>
          <h2 style={{ fontSize: 20, flex: 1 }}>Salvar em…</h2>
          <button className="icone-bt" onClick={fechar} aria-label="Fechar">
            <Icone nome="x" />
          </button>
        </div>
        <div className="janela-lista">
          {colecoes === null && <div className="esqueleto" style={{ height: 44 }} />}
          {colecoes?.length === 0 && <p className="fraco" style={{ padding: "4px 12px 10px" }}>Você ainda não tem coleções. Crie a primeira abaixo.</p>}
          {colecoes?.map((c) => (
            <button key={c.id} className="janela-item" onClick={() => alternar(c)} aria-pressed={marcadas.has(String(c.id))}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center",
                  background: marcadas.has(String(c.id)) ? "var(--ink)" : "var(--surface-2)", color: "var(--bg)",
                }}
              >
                {marcadas.has(String(c.id)) && <Icone nome="check" tamanho={14} traco={2.4} />}
              </span>
              <span style={{ flex: 1 }}>{c.nome}</span>
              <span className="fraco mono" style={{ fontSize: 12 }}>{c.itens}</span>
            </button>
          ))}
        </div>
        <form onSubmit={criar} style={{ display: "flex", gap: 8, padding: "8px 16px 18px" }}>
          <input className="campo" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova coleção" aria-label="Nome da nova coleção" maxLength={60} />
          <button className="bt1" disabled={!nova.trim()}>
            <Icone nome="mais" /> Criar
          </button>
        </form>
      </div>
    </div>
  );
}
