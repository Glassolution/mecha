"use client";
// TEMPORÁRIO: só para conferir o visual dos cartões de resultado sem conta. Apagar depois.
import { useApi } from "@/lib/api";
import { capaUrl, num } from "@/lib/fmt";
import type { Video } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { SeloFonte } from "@/components/SeloFonte";

export default function Previa() {
  const { dados } = useApi<{ itens: Video[] }>("/api/publico/em-alta?limite=4");
  return (
    <main style={{ padding: 40, maxWidth: 1240, margin: "0 auto" }}>
      <div className="res-grade">
        {(dados?.itens ?? []).map((v, i) => (
          <article key={v.id} className="res-cartao">
            <a className="res-thumb">
              <img src={capaUrl(v.capa)!} alt="" />
              <span className="res-views"><Icone nome="olho" tamanho={12} /> {num(v.views)}</span>
            </a>
            <div className="res-meta">
              <div className="res-txt">
                <b>{(v.texto ?? "").split("\n")[0]}</b>
                <span className="res-autor">
                  <SeloFonte fonte={i % 2 ? "instagram" : "tiktok"} soIcone />
                  <span className="res-autor-txt">{v.autor}{v.views_dia ? ` · ${num(v.views_dia)}/dia` : ""}</span>
                </span>
              </div>
              <a className="res-abrir">Abrir</a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
