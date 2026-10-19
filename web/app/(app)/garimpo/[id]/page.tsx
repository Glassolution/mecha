"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import { capaUrl, mmss } from "@/lib/fmt";
import type { EstadoFonte, Garimpo, Video } from "@/lib/tipos";
import { CartaoVideo, primeiraLinha, Vazio } from "@/components/Cartoes";
import { Icone } from "@/components/Icone";
import { SalvarEm } from "@/components/SalvarEm";

const NOME_FONTE: Record<string, string> = {
  tiktok: "TikTok", youtube: "YouTube Shorts", tiktok_ads: "TikTok Ads", meta_ads: "Facebook e Instagram Ads", instagram: "Reels",
};
const ESTADO: Record<Garimpo["status"], string> = {
  aguardando: "Na fila", garimpando: "Garimpando", concluido: "Concluído", parado: "Parado", erro: "Não deu",
};

function textoFonte(f: Omit<EstadoFonte, "fonte">) {
  switch (f.status) {
    case "buscando": return `buscando “${f.termo}”`;
    case "pronto": return "pronto";
    case "erro": return f.detalhe ?? "não deu";
    case "parado": return "parado";
    case "trancada": return f.detalhe ?? "trancada";
    default: return "na fila";
  }
}

function Numero({ rotulo, valor, destaque, espera, seta }: { rotulo: string; valor: number | null; destaque?: boolean; espera?: string; seta?: boolean }) {
  const [pulo, setPulo] = useState(0);
  const anterior = useRef(valor);
  useEffect(() => {
    if (valor !== anterior.current) {
      anterior.current = valor;
      setPulo((p) => p + 1);
    }
  }, [valor]);
  return (
    <div className={`numero${destaque ? " destaque" : ""}`}>
      <div className="rotulo">{rotulo}</div>
      {valor === null ? (
        <div className="valor fraco" style={{ fontSize: 30 }} title={espera}>
          <Icone nome="relogio" tamanho={28} />
        </div>
      ) : (
        <div key={pulo} className={`valor${pulo ? " pula" : ""}`} aria-live="polite">{valor.toLocaleString("pt-BR")}</div>
      )}
      {espera && <div className="fraco" style={{ fontSize: 12 }}>{espera}</div>}
      {seta && <span className="seta" aria-hidden="true"><Icone nome="direita" /></span>}
    </div>
  );
}

export default function PaginaAoVivo() {
  return (
    <Suspense fallback={<div className="esqueleto" style={{ height: 400 }} />}>
      <AoVivo />
    </Suspense>
  );
}

function AoVivo() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const verGrade = sp.get("ver") === "grade";
  const [g, setG] = useState<Garimpo | null>(null);
  const [videos, setVideos] = useState<(Video & { novo?: boolean })[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState<string | null>(null);
  const [parando, setParando] = useState(false);

  useEffect(() => {
    const fonte = new EventSource(`/api/garimpos/${id}/fluxo`);
    fonte.addEventListener("retrato", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setG(d.garimpo);
      setVideos(d.videos);
    });
    fonte.addEventListener("fonte", (e) => {
      const { fonte: f, ...estado } = JSON.parse((e as MessageEvent).data);
      setG((x) => (x ? { ...x, por_fonte: { ...x.por_fonte, [f]: estado } } : x));
    });
    fonte.addEventListener("agora", (e) => {
      const { texto } = JSON.parse((e as MessageEvent).data);
      setG((x) => (x ? { ...x, agora: texto } : x));
    });
    fonte.addEventListener("status", (e) => {
      const { status } = JSON.parse((e as MessageEvent).data);
      setG((x) => (x ? { ...x, status } : x));
    });
    fonte.addEventListener("contagens", (e) => {
      const c = JSON.parse((e as MessageEvent).data);
      setG((x) => (x ? { ...x, ...c } : x));
    });
    fonte.addEventListener("chegou", (e) => {
      const { videos: novos } = JSON.parse((e as MessageEvent).data) as { videos: Video[] };
      setVideos((vs) => {
        const ids = new Set(vs.map((v) => v.id));
        return [...novos.filter((v) => !ids.has(v.id)).map((v) => ({ ...v, novo: true })), ...vs].slice(0, 48);
      });
    });
    fonte.addEventListener("fim", (e) => {
      const c = JSON.parse((e as MessageEvent).data);
      setG((x) => (x ? { ...x, ...c, agora: null, fim_em: new Date().toISOString() } : x));
      limparCache("/api/eu");
      limparCache("/api/garimpos");
      fonte.close();
    });
    fonte.onerror = () => {
      if (fonte.readyState === EventSource.CLOSED) setErro("A conexão ao vivo caiu. Atualize a página para ver o estado atual.");
    };
    return () => fonte.close();
  }, [id]);

  const ativo = g?.status === "garimpando" || g?.status === "aguardando";
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);

  async function parar() {
    setParando(true);
    try {
      await api(`/api/garimpos/${id}/parar`, { method: "POST" });
    } finally {
      setParando(false);
    }
  }

  if (erro && !g) return <Vazio titulo="Não deu para abrir este garimpo." texto={erro} acao={<Link className="bt1" href="/garimpo">Nova busca</Link>} />;
  if (!g) return <div className="esqueleto" style={{ height: 420 }} />;

  const inicio = new Date(g.criado_em).getTime();
  const fim = g.fim_em ? new Date(g.fim_em).getTime() : agora;
  const segundos = Math.max(0, (ativo ? agora : fim) - inicio) / 1000;
  const recentes = videos.slice(0, 7);

  if (verGrade) return <GradeDoGarimpo id={id} g={g} voltar={() => router.push(pathname)} />;

  return (
    <>
      <div className="ao-vivo-topo">
        <span className={`ponto${ativo ? " vivo" : ""}`} aria-hidden="true" />
        <span className="estado">{ESTADO[g.status]}</span>
        <span className="agora">
          {g.agora ?? (g.status === "concluido" ? `“${g.termos.join("”, “")}”` : g.status === "parado" ? "O que já chegou ficou guardado." : "")}
        </span>
        <span className="cronometro">{mmss(segundos)}</span>
        {ativo && (
          <button className="bt2" onClick={parar} disabled={parando}>
            <Icone nome="parar" tamanho={16} /> {parando ? "Parando…" : "Parar"}
          </button>
        )}
      </div>

      <div className="etiquetas-fonte">
        {Object.entries(g.por_fonte).map(([f, estado]) => (
          <span key={f} className={`etiqueta-fonte${estado.status === "erro" ? " erro" : ""}`}>
            {estado.status === "trancada" ? <Icone nome="cadeado" tamanho={14} /> : null}
            <b>{NOME_FONTE[f] ?? f}</b>
            {typeof estado.novos === "number" && estado.status !== "trancada" && <span className="mono">{estado.novos}</span>}
            <span className="st">{textoFonte(estado)}</span>
          </span>
        ))}
      </div>

      <div className="numeros">
        <Numero rotulo="Achados" valor={g.vistos} seta />
        <Numero rotulo="Com legenda" valor={g.transcritos} destaque seta />
        <Numero rotulo="Com SaaS" valor={null} espera="Chega com o leitor de SaaS" seta />
        <Numero rotulo="Ideias novas" valor={null} espera="Chega com o leitor de SaaS" />
      </div>

      {!ativo && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <Link className="bt1 bt-g" href={`${pathname}?ver=grade`}>
            Ver os {g.vistos.toLocaleString("pt-BR")} vídeos
          </Link>
          <Link className="bt2 bt-g" href="/garimpo">Nova busca</Link>
        </div>
      )}

      <div className="ao-vivo-corpo">
        <section aria-label="Vídeos mais novos">
          {videos.length === 0 ? (
            <div className="mosaico">
              {Array.from({ length: ativo ? 12 : 0 }, (_, i) => <div key={i} className="ladrilho fila" />)}
              {!ativo && <p className="fraco">Nenhum vídeo chegou neste garimpo.</p>}
            </div>
          ) : (
            <div className="mosaico">
              {videos.map((v) => (
                <Link key={v.id} href={`/video/${encodeURIComponent(v.id)}`} className={`ladrilho${v.novo ? " chegando" : ""}`} title={primeiraLinha(v.texto)}>
                  {v.capa ? <img src={capaUrl(v.capa)!} alt="" loading="lazy" /> : <div className="capa-vazia" />}
                  {!v.transcrito && <span className="sem-legenda">sem legenda</span>}
                  <span className="metrica">{v.metrica}</span>
                </Link>
              ))}
              {ativo && Array.from({ length: Math.max(0, 6 - (videos.length % 6)) }, (_, i) => <div key={`f${i}`} className="ladrilho fila" />)}
            </div>
          )}
        </section>
        <aside className="coluna-agora painel-p">
          <h2 style={{ fontSize: 17, marginBottom: 12 }}>Chegaram agora</h2>
          {recentes.length === 0 ? (
            <p className="fraco" style={{ fontSize: 14 }}>Os vídeos aparecem aqui assim que chegam.</p>
          ) : (
            <ol>
              {recentes.map((v) => (
                <li key={v.id}>
                  {v.capa ? <img src={capaUrl(v.capa)!} alt="" /> : <div className="capa-vazia" />}
                  <Link href={`/video/${encodeURIComponent(v.id)}`} style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primeiraLinha(v.texto)}</div>
                    <div className="fraco mono" style={{ fontSize: 12 }}>{v.autor} · {v.metrica}</div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
      {erro && <p className="erro-caixa" role="alert" style={{ marginTop: 16 }}>{erro}</p>}
    </>
  );
}

function GradeDoGarimpo({ id, g, voltar }: { id: string; g: Garimpo; voltar: () => void }) {
  const { dados } = useApi<Video[]>(`/api/garimpos/${id}/videos`);
  const [salvando, setSalvando] = useState<Video | null>(null);
  return (
    <>
      <button className="bt3" onClick={voltar} style={{ marginBottom: 12 }}>
        <Icone nome="voltar" /> Ao vivo
      </button>
      <h1 className="titulo-pagina" style={{ fontSize: 34 }}>“{g.termos.join("”, “")}”</h1>
      <p className="sub-pagina" style={{ marginBottom: 24 }}>{g.vistos} vídeos, do mais visto ao menos visto.</p>
      {!dados ? (
        <div className="esqueleto" style={{ height: 400 }} />
      ) : (
        <div className="grade-videos">
          {dados.map((v) => <CartaoVideo key={v.id} v={v} aoSalvar={setSalvando} />)}
        </div>
      )}
      {salvando && <SalvarEm tipo="video" id={salvando.id} fechar={() => setSalvando(null)} />}
    </>
  );
}
