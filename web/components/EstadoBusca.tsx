"use client";

import { useEffect, useState } from "react";
import { Icone } from "./Icone";
import { MarcaSvg } from "./Marca";
import { NumeroSobe } from "./Movimento";

const FRASES = [
  "Farejando os vídeos mais vistos…",
  "Abrindo vídeo por vídeo…",
  "Lendo as legendas…",
  "Separando o que está bombando…",
  "Conferindo lá fora também…",
  "Quase lá, guardando tudo…",
];

function duracao(segundos: number) {
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min${s % 60 ? ` ${s % 60} s` : ""}`;
}

type Props = {
  estado: "buscando" | "concluido" | "parado" | "erro";
  termo: string | null;
  quantos: number;
  transcritos: number;
  segundos: number;
  detalhe?: string | null;
  parando?: boolean;
  aoParar?: () => void;
};

/** O estado da busca contado pelo mascote: procurando, achou, parou ou não deu. */
export function EstadoBusca({ estado, termo, quantos, transcritos, segundos, detalhe, parando, aoParar }: Props) {
  const [frase, setFrase] = useState(0);
  useEffect(() => {
    if (estado !== "buscando") return;
    const t = setInterval(() => setFrase((f) => (f + 1) % FRASES.length), 2600);
    return () => clearInterval(t);
  }, [estado]);

  const humor = estado === "buscando" ? "marca-busca" : estado === "concluido" ? "marca-feliz" : "marca-quieta";

  return (
    <div className={`eb eb-${estado}`} role="status" aria-live="polite">
      <div className="eb-mascote">
        <MarcaSvg tamanho={58} className={humor} />
        {estado === "concluido" && (
          <span className="eb-brilhos" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <i key={i} />)}
          </span>
        )}
      </div>

      <div className="eb-texto">
        {estado === "buscando" && (
          <>
            <b>Procurando {termo ? <span className="eb-termo">“{termo}”</span> : "os vídeos"}</b>
            <span key={frase} className="eb-frase">{FRASES[frase]}</span>
          </>
        )}
        {estado === "concluido" && (
          <>
            <b>{quantos > 0 ? <>Achei <NumeroSobe valor={quantos} /> {quantos === 1 ? "vídeo" : "vídeos"}</> : "Não achei vídeos desta vez"}</b>
            <span className="eb-frase">
              em {duracao(segundos)}{transcritos > 0 ? ` · ${transcritos} com a fala captada` : ""}
            </span>
          </>
        )}
        {estado === "parado" && (
          <>
            <b>Busca parada</b>
            <span className="eb-frase">{quantos > 0 ? `Guardei os ${quantos} vídeos que já tinham chegado.` : "Nenhum vídeo tinha chegado ainda."}</span>
          </>
        )}
        {estado === "erro" && (
          <>
            <b>Não deu desta vez</b>
            <span className="eb-frase">{detalhe ?? "Tente de novo em 1 minuto."}</span>
          </>
        )}
      </div>

      {estado === "buscando" && (
        <div className="eb-direita">
          <span className="eb-contador" key={quantos}>
            <b>{quantos}</b> {quantos === 1 ? "vídeo" : "vídeos"}
          </span>
          <span className="eb-tempo">{duracao(segundos)}</span>
          {aoParar && (
            <button className="eb-parar" onClick={aoParar} disabled={parando}>
              <Icone nome="parar" tamanho={12} /> {parando ? "Parando…" : "Parar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
