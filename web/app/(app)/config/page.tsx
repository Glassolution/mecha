"use client";

import { useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import { useApp } from "@/components/Contexto";
import type { Eu } from "@/lib/tipos";

type Nicho = { id: string; rotulo: string };

export default function Configuracoes() {
  const { eu } = useApp();
  if (!eu) return <div className="esqueleto" style={{ height: 400 }} />;
  return <FormConfig eu={eu} />;
}

function FormConfig({ eu }: { eu: Eu }) {
  const { recarregarEu, avisar } = useApp();
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [nome, setNome] = useState(eu.espaco.nome);
  const [interesse, setInteresse] = useState<"achar_ideia" | "achar_criativo">(eu.espaco.interesse ?? "achar_ideia");
  const [escolhidos, setEscolhidos] = useState<string[]>(eu.espaco.nichos);
  const [verIngles, setVerIngles] = useState(eu.espaco.ver_ingles);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/espaco", { method: "PATCH", json: { nome: nome.trim() || "Meu espaço", interesse, nichos: escolhidos, ver_ingles: verIngles } });
    limparCache("/api/eu");
    await recarregarEu();
    avisar("Salvo");
  }

  return (
    <>
      <h1 className="titulo-pagina" style={{ marginBottom: 28 }}>Configurações</h1>
      <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
        <form className="painel" onSubmit={salvar}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Meu espaço</h2>
          <label className="secao-titulo" htmlFor="nome" style={{ marginTop: 0 }}>Nome</label>
          <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
          <div className="secao-titulo">O que você quer</div>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={interesse === "achar_ideia"} onClick={() => setInteresse("achar_ideia")}>Achar uma ideia</button>
            <button type="button" className="chip" aria-pressed={interesse === "achar_criativo"} onClick={() => setInteresse("achar_criativo")}>Divulgar o meu SaaS</button>
          </div>
          <div className="secao-titulo">Nichos</div>
          <div className="chips">
            {(nichos ?? []).filter((n) => n.id !== "outro").map((n) => (
              <button
                type="button"
                key={n.id}
                className="chip"
                aria-pressed={escolhidos.includes(n.id)}
                onClick={() => setEscolhidos((x) => (x.includes(n.id) ? x.filter((y) => y !== n.id) : [...x, n.id]))}
              >
                {n.rotulo}
              </button>
            ))}
          </div>
          <div className="secao-titulo">País e idioma</div>
          <div className="chips">
            <span className="chip ligado">Brasil · Português</span>
            <button type="button" className="chip" aria-pressed={verIngles} onClick={() => setVerIngles((v) => !v)}>Ver também o que bomba em inglês</button>
          </div>
          <button className="bt1" style={{ marginTop: 22 }}>Salvar</button>
        </form>

        <section className="painel" id="plano">
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Plano e uso</h2>
          <p>
            Plano <b>{eu.plano.nome}</b> · {eu.uso.garimpos} de {eu.plano.garimpos} garimpos usados no mês
          </p>
          <p className="fraco" style={{ fontSize: 14, marginTop: 8 }}>A assinatura (Stripe) chega antes de publicar.</p>
        </section>

        <section className="painel">
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Conexões</h2>
          <p className="suave">Extensão do Chrome para o TikTok Ads: chega na fase 2.</p>
        </section>
      </div>
    </>
  );
}
