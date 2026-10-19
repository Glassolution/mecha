"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";

export default function Entrar() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setEnviando(true);
    setErro(null);
    try {
      await api("/api/dev/entrar", { method: "POST", json: { nome: "Meu espaço" } });
      location.href = "/inicio";
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="entrada">
      <div className="entrada-caixa">
        <Logo tamanho={34} />
        <h1 style={{ fontSize: 34, marginTop: 18 }}>As ideias de SaaS que estão bombando, em 1 minuto.</h1>
        <p className="suave">Entre para ver o que está em alta no seu nicho.</p>
        <div style={{ display: "grid", gap: 10, width: "100%", marginTop: 18 }}>
          <button className="bt2 bt-g" disabled title="Chega antes de publicar">
            Entrar com o Google
          </button>
          <button className="bt2 bt-g" disabled title="Chega antes de publicar">
            Entrar com e-mail
          </button>
          <button className="bt1 bt-g" onClick={entrar} disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar neste computador"}
          </button>
        </div>
        <p className="fraco" style={{ fontSize: 13 }}>
          Google e e-mail chegam antes de publicar. Por enquanto, a entrada funciona só neste computador.
        </p>
        {erro && <p className="erro-caixa" role="alert">{erro}</p>}
      </div>
    </main>
  );
}
