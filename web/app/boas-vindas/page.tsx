"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import type { Eu } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { Logo } from "@/components/Logo";

type Nicho = { id: string; rotulo: string };

export default function BoasVindas() {
  const { dados: eu } = useApi<Eu>("/api/eu");
  if (!eu) return <main className="entrada"><div className="esqueleto" style={{ width: 440, height: 360 }} /></main>;
  return <Perguntas eu={eu} />;
}

function Perguntas({ eu }: { eu: Eu }) {
  const router = useRouter();
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [passo, setPasso] = useState(0);
  const [interesse, setInteresse] = useState<"achar_ideia" | "achar_criativo">(eu.espaco.interesse ?? "achar_ideia");
  const [escolhidos, setEscolhidos] = useState<string[]>(eu.espaco.nichos);
  const [verIngles, setVerIngles] = useState(eu.espaco.ver_ingles);
  const [salvando, setSalvando] = useState(false);

  async function concluir() {
    setSalvando(true);
    await api("/api/espaco", {
      method: "PATCH",
      json: { interesse, nichos: escolhidos, idioma: "pt", ver_ingles: verIngles, boas_vindas_ok: true },
    });
    limparCache("/api/eu");
    router.replace(escolhidos[0] ? `/ideias?nicho=${escolhidos[0]}` : "/inicio");
  }

  const alternar = (id: string) => setEscolhidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  return (
    <main className="entrada">
      <div className="entrada-caixa" style={{ maxWidth: passo === 1 ? 640 : 460 }}>
        <Logo tamanho={26} />
        <div className="progresso" aria-label={`Pergunta ${passo + 1} de 3`}>
          {[0, 1, 2].map((i) => <i key={i} className={i <= passo ? "feito" : ""} />)}
        </div>

        {passo === 0 && (
          <>
            <h1 style={{ fontSize: 32, marginTop: 10 }}>O que você quer?</h1>
            <div className="passo-opcoes">
              <button className="opcao-grande" aria-pressed={interesse === "achar_ideia"} onClick={() => setInteresse("achar_ideia")}>
                <Icone nome="ideia" tamanho={24} />
                <span><b>Achar uma ideia para construir</b><span>SaaS que estão ganhando atenção agora</span></span>
              </button>
              <button className="opcao-grande" aria-pressed={interesse === "achar_criativo"} onClick={() => setInteresse("achar_criativo")}>
                <Icone nome="play" tamanho={24} />
                <span><b>Divulgar o meu SaaS</b><span>Vídeos que fazem software parecer irresistível</span></span>
              </button>
            </div>
            <button className="bt1 bt-g" style={{ width: "100%", marginTop: 8 }} onClick={() => setPasso(1)}>Continuar</button>
          </>
        )}

        {passo === 1 && (
          <>
            <h1 style={{ fontSize: 32, marginTop: 10 }}>Quais nichos te interessam?</h1>
            <p className="suave">Pode escolher vários. Dá para mudar depois.</p>
            <div className="chips" style={{ justifyContent: "center", marginTop: 14 }}>
              {(nichos ?? []).filter((n) => n.id !== "outro").map((n) => (
                <button key={n.id} className="chip" style={{ height: 42, fontSize: 15, padding: "0 18px" }} aria-pressed={escolhidos.includes(n.id)} onClick={() => alternar(n.id)}>
                  {n.rotulo}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 18 }}>
              <button className="bt2 bt-g" onClick={() => setPasso(0)}>Voltar</button>
              <button className="bt1 bt-g" style={{ flex: 1 }} onClick={() => setPasso(2)}>
                {escolhidos.length ? "Continuar" : "Pular, quero ver todos"}
              </button>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1 style={{ fontSize: 32, marginTop: 10 }}>País e idioma</h1>
            <div className="passo-opcoes">
              <div className="opcao-grande" aria-pressed="true">
                <span style={{ fontSize: 24 }} aria-hidden="true">🇧🇷</span>
                <span><b>Brasil · Português</b><span>Vídeos e ideias do Brasil</span></span>
              </div>
              <button className="opcao-grande" aria-pressed={verIngles} onClick={() => setVerIngles((v) => !v)}>
                <span style={{ fontSize: 24 }} aria-hidden="true">🌎</span>
                <span><b>Ver também o que bomba em inglês</b><span>As ideias que ainda não têm versão no Brasil</span></span>
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
              <button className="bt2 bt-g" onClick={() => setPasso(1)}>Voltar</button>
              <button className="bt1 bt-g" style={{ flex: 1 }} onClick={concluir} disabled={salvando}>
                {salvando ? "Abrindo…" : "Ver as ideias em alta"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
