"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { capaUrl, num, pct, PLATAFORMA, tiktokId } from "@/lib/fmt";
import type { Ideia, ItemVeredito, Video } from "@/lib/tipos";
import { Icone } from "./Icone";

/** Player oficial de incorporação do TikTok, sem som e sem controles (o vídeo nunca é copiado). */
export function playerTikTok(id: string, controles = false) {
  const p = new URLSearchParams({
    autoplay: "1", muted: controles ? "0" : "1", controls: controles ? "1" : "0", progress_bar: controles ? "1" : "0",
    play_button: controles ? "1" : "0", volume_control: controles ? "1" : "0", fullscreen_button: controles ? "1" : "0",
    timestamp: "0", music_info: "0", description: "0", rel: "0", native_context_menu: "0", closed_caption: "0", loop: "1",
  });
  return `https://www.tiktok.com/player/v1/${id}?${p}`;
}

export function CartaoVideo({ v, aoSalvar, salvo }: { v: Video; aoSalvar?: (v: Video) => void; salvo?: boolean }) {
  const [tocando, setTocando] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capa = capaUrl(v.capa);
  const tt = tiktokId(v.id);

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);

  if (v.bloqueado) {
    return (
      <Link href="/config#plano" className="cartao-video bloqueado" aria-label="Assinar o Pro para ver este vídeo">
        <div className="capa">{capa ? <img src={capa} alt="" loading="lazy" /> : <div className="capa-vazia" />}</div>
        <div className="sobre">
          <span className="selo selo-novo"><Icone nome="cadeado" tamanho={13} /> Assinar o Pro</span>
        </div>
      </Link>
    );
  }

  function entrar() {
    if (!tt || window.matchMedia("(hover: none)").matches) return;
    espera.current = setTimeout(() => setTocando(true), 450);
  }
  function sairDoCartao() {
    if (espera.current) clearTimeout(espera.current);
    setTocando(false);
  }

  return (
    <div className="cartao-video" onMouseEnter={entrar} onMouseLeave={sairDoCartao}>
      <Link href={`/video/${encodeURIComponent(v.id)}`} aria-label={`Abrir a ficha do vídeo de ${v.autor ?? "autor"}`}>
        <div className="capa">
          {capa ? <img src={capa} alt="" loading="lazy" /> : <div className="capa-vazia" />}
          {tocando && tt && <iframe src={playerTikTok(tt)} title="Vídeo tocando sem som" allow="autoplay; encrypted-media" />}
          <div className="sobre">
            <div className="linha">
              <span className="plataforma">{PLATAFORMA[v.fonte] ?? v.fonte}</span>
              {v.nota !== null && <span className="nota">{v.nota}</span>}
            </div>
            <p className="gancho">{v.gancho ?? primeiraLinha(v.texto, "")}</p>
          </div>
        </div>
      </Link>
      {aoSalvar && (
        <button
          className="salvar"
          aria-pressed={!!salvo}
          aria-label={salvo ? "Salvo. Mudar coleção" : "Salvar em uma coleção"}
          onClick={() => aoSalvar(v)}
        >
          <Icone nome={salvo ? "check" : "salvo"} tamanho={16} />
        </button>
      )}
      <div className="rodape">
        <span className="autor">{v.autor ?? "—"}</span>
        <span className="mono fraco">{v.metrica}</span>
      </div>
    </div>
  );
}

export function primeiraLinha(texto: string | null | undefined, vazio = "Post sem texto") {
  const t = (texto ?? "").split("\n")[0].replace(/(#\S+\s*)+$/g, "").trim();
  return t || vazio;
}

export function SetaTendencia({ c, medindo }: { c: number | null; medindo?: boolean }) {
  if (c === null || medindo) {
    return (
      <span className="tendencia medindo">
        <Icone nome="relogio" tamanho={14} /> medindo
      </span>
    );
  }
  return (
    <span className={`tendencia ${c >= 0 ? "sobe" : "desce"}`}>
      <Icone nome={c >= 0 ? "sobe" : "desce"} tamanho={14} /> {pct(c)}
    </span>
  );
}

export function CartaoIdeia({ i }: { i: Ideia }) {
  if (i.bloqueado) {
    return (
      <Link href="/config#plano" className="cartao-ideia" style={{ alignItems: "center", justifyContent: "center", filter: "saturate(.4)" }}>
        <span className="selo selo-novo"><Icone nome="cadeado" tamanho={13} /> Assinar o Pro</span>
      </Link>
    );
  }
  const medindo = i.crescimento === null || i.videos < 3 || !i.historia_7d;
  return (
    <Link href={`/ideia/${i.id}`} className="cartao-ideia">
      <div className="ideia-topo">
        <span className="fraco" style={{ fontSize: 14 }}>{i.nicho_rotulo}</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {i.exemplo && <span className="selo selo-exemplo">Exemplo</span>}
          <span className="nota" title="Nota da ideia">{i.nota}</span>
        </span>
      </div>
      <div className="leque" aria-hidden="true">
        <div><div className="capa-vazia" /></div>
        <div><div className="capa-vazia" /></div>
        <div><div className="capa-vazia" /></div>
      </div>
      <h3>{i.titulo_pt}</h3>
      <SetaTendencia c={i.crescimento} medindo={medindo} />
      <p className="ideia-meta">
        {i.videos} vídeos · {i.autores} criadores · {num(i.views_total)} views
      </p>
    </Link>
  );
}

export function ListaVeredito({ itens }: { itens: ItemVeredito[] }) {
  return (
    <ul className="veredito">
      {itens.map((i) => (
        <li key={i.k}>
          {i.ok === true && <span className="marca-ok" aria-label="passa"><Icone nome="check" /></span>}
          {i.ok === false && <span className="marca-nao" aria-label="não passa"><Icone nome="x" /></span>}
          {i.ok === null && <span className="marca-espera" aria-label="esperando"><Icone nome="relogio" /></span>}
          <span>{i.txt}</span>
        </li>
      ))}
    </ul>
  );
}

export function Grafico({ serie }: { serie: number[] }) {
  if (!serie.length) return null;
  const max = Math.max(...serie, 1);
  const min = Math.min(...serie);
  const l = 600, a = 120, m = 6;
  const pts = serie.map((v, i) => [m + (i * (l - 2 * m)) / (serie.length - 1), a - m - ((v - min) / (max - min || 1)) * (a - 2 * m)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[pts.length - 1];
  return (
    <svg className="grafico" viewBox={`0 0 ${l} ${a}`} preserveAspectRatio="none" role="img" aria-label="Views por dia nos últimos 30 dias">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={ux} cy={uy} r="4" fill="currentColor" />
    </svg>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="vazio">
      <h3 style={{ fontSize: 22 }}>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {acao}
    </div>
  );
}

export function AvisoExemplo({ children }: { children?: React.ReactNode }) {
  return (
    <div className="aviso-exemplo" role="note">
      <span className="selo selo-exemplo">Exemplo</span>
      <span>{children ?? "Estas ideias são de exemplo, para mostrar a tela. As ideias reais chegam quando o leitor de SaaS for ligado."}</span>
    </div>
  );
}
