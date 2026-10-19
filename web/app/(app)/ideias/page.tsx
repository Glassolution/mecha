"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useApi } from "@/lib/api";
import type { Ideia, Video } from "@/lib/tipos";
import { AvisoExemplo, CartaoIdeia, CartaoVideo, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { SalvarEm } from "@/components/SalvarEm";

type Nicho = { id: string; rotulo: string };

const PRATELEIRAS = [
  { id: "explodindo", nome: "Explodindo esta semana" },
  { id: "fora", nome: "Bombando lá fora" },
  { id: "criadores", nome: "Muitos criadores falando" },
  { id: "vistas", nome: "Mais vistas de sempre" },
];

export default function PaginaIdeias() {
  return (
    <Suspense fallback={<div className="esqueleto" style={{ height: 400 }} />}>
      <Ideias />
    </Suspense>
  );
}

function Ideias() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { eu } = useApp();
  const modo = sp.get("modo") === "criativo" ? "criativo" : "ideia";
  const nicho = sp.get("nicho") ?? "";
  const prateleira = sp.get("prateleira") ?? "todas";
  const [filtroAberto, setFiltroAberto] = useState(false);
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");

  function mudar(params: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === "" || v === "todas") p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const lista = (nichos ?? []).filter((n) => n.id !== "outro");
  const metade = Math.ceil(lista.length / 2);

  return (
    <>
      <section className="catalogo" aria-label="Catálogo">
        <div>
          <h2>Nichos</h2>
          <ul>
            {lista.slice(0, metade).map((n) => (
              <li key={n.id}>
                <button aria-pressed={nicho === n.id} onClick={() => mudar({ nicho: nicho === n.id ? null : n.id })}>{n.rotulo}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 aria-hidden="true">&nbsp;</h2>
          <ul>
            {lista.slice(metade).map((n) => (
              <li key={n.id}>
                <button aria-pressed={nicho === n.id} onClick={() => mudar({ nicho: nicho === n.id ? null : n.id })}>{n.rotulo}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Prateleiras</h2>
          <ul>
            {PRATELEIRAS.map((p) => (
              <li key={p.id}>
                <button
                  aria-pressed={modo === "ideia" && prateleira === p.id}
                  onClick={() => mudar({ modo: null, prateleira: prateleira === p.id ? null : p.id })}
                >
                  {p.nome}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Modo</h2>
          <ul>
            <li><button aria-pressed={modo === "ideia"} onClick={() => mudar({ modo: null })}>Achar ideia</button></li>
            <li><button aria-pressed={modo === "criativo"} onClick={() => mudar({ modo: "criativo", prateleira: null })}>Achar criativo</button></li>
          </ul>
        </div>
      </section>

      {modo === "ideia" ? (
        <GradeIdeias nicho={nicho} prateleira={prateleira} mudar={mudar} filtroAberto={filtroAberto} setFiltroAberto={setFiltroAberto} sp={sp} gratis={eu?.plano.id === "gratis"} />
      ) : (
        <GradeVideos mudar={mudar} sp={sp} gratis={eu?.plano.id === "gratis"} filtroAberto={filtroAberto} setFiltroAberto={setFiltroAberto} />
      )}
    </>
  );
}

type Props = {
  mudar: (p: Record<string, string | null>) => void;
  sp: URLSearchParams | ReturnType<typeof useSearchParams>;
  gratis: boolean;
  filtroAberto: boolean;
  setFiltroAberto: (f: (a: boolean) => boolean) => void;
};

function FaixaPro() {
  return (
    <div className="faixa">
      <span className="selo selo-novo">PRO</span>
      <span>
        O plano grátis mostra as 20 primeiras — <Link href="/config#plano">Assinar o Pro</Link>
      </span>
    </div>
  );
}

function GradeIdeias({ nicho, prateleira, mudar, filtroAberto, setFiltroAberto, sp, gratis }: Props & { nicho: string; prateleira: string }) {
  const atencao = sp.get("atencao") ?? "leve";
  const tendencia = sp.get("tendencia") ?? "subindo";
  const semBr = sp.get("sem_br") === "1";
  const q = new URLSearchParams({ atencao, tendencia, prateleira, ...(nicho ? { nicho } : {}), ...(semBr ? { sem_br: "true" } : {}) });
  const { dados, carregando } = useApi<{ itens: Ideia[] }>(`/api/ideias?${q}`);
  const ordem = prateleira === "vistas" ? "vistas" : "todas";

  return (
    <>
      <div className="sublinhadas" role="tablist">
        <button className="sublinhada" role="tab" aria-selected={!["explodindo", "fora", "criadores", "vistas"].includes(prateleira)} onClick={() => mudar({ prateleira: null })}>
          Em alta
        </button>
        <button className="sublinhada" role="tab" aria-selected={ordem === "vistas"} onClick={() => mudar({ prateleira: "vistas" })}>
          Mais vistas
        </button>
        <button className="bt3 direita" onClick={() => setFiltroAberto((a) => !a)} aria-expanded={filtroAberto}>
          <Icone nome="filtro" /> Filtro
        </button>
      </div>
      {filtroAberto && (
        <div className="chips" style={{ marginBottom: 20 }}>
          <span className="fraco" style={{ alignSelf: "center", marginRight: 4 }}>Atenção</span>
          {[["leve", "200 mil+"], ["media", "1 mi+"], ["forte", "5 mi+"]].map(([k, r]) => (
            <button key={k} className="chip" aria-pressed={atencao === k} onClick={() => mudar({ atencao: k === "leve" ? null : k })}>{r}</button>
          ))}
          <span className="fraco" style={{ alignSelf: "center", margin: "0 4px 0 12px" }}>Tendência</span>
          {[["subindo", "Subindo"], ["media", "+20%"], ["explodindo", "+50%"]].map(([k, r]) => (
            <button key={k} className="chip" aria-pressed={tendencia === k} onClick={() => mudar({ tendencia: k === "subindo" ? null : k })}>{r}</button>
          ))}
          <button className="chip" style={{ marginLeft: 12 }} aria-pressed={semBr} onClick={() => mudar({ sem_br: semBr ? null : "1" })}>
            Sem versão no Brasil
          </button>
        </div>
      )}
      <AvisoExemplo />
      {gratis && <FaixaPro />}
      {carregando && !dados ? (
        <div className="grade-ideias">{[0, 1, 2].map((i) => <div key={i} className="esqueleto" style={{ height: 420 }} />)}</div>
      ) : dados?.itens.length ? (
        <div className="grade-ideias">
          {dados.itens.map((i) => <CartaoIdeia key={i.id} i={i} />)}
        </div>
      ) : (
        <Vazio titulo="Nenhuma ideia com esse filtro." texto="Tire um filtro ou garimpe palavras deste nicho." acao={<Link href="/garimpo" className="bt1">Garimpar</Link>} />
      )}
    </>
  );
}

function GradeVideos({ mudar, sp, gratis, filtroAberto, setFiltroAberto }: Props) {
  const ordem = sp.get("ordem") ?? "views";
  const prova = sp.get("prova") ?? "qualquer";
  const idioma = sp.get("idioma") ?? "";
  const q = new URLSearchParams({ ordem, prova, ...(idioma ? { idioma } : {}) });
  const { dados, carregando } = useApi<{ total: number; itens: Video[] }>(`/api/videos?${q}`);
  const [salvando, setSalvando] = useState<Video | null>(null);
  const [salvos, setSalvos] = useState<Set<string>>(new Set());

  return (
    <>
      <div className="sublinhadas" role="tablist">
        {[["views", "Mais vistos"], ["recentes", "Mais recentes"], ["salvamentos", "Mais salvos"]].map(([k, r]) => (
          <button key={k} className="sublinhada" role="tab" aria-selected={ordem === k} onClick={() => mudar({ ordem: k === "views" ? null : k })}>
            {r}
          </button>
        ))}
        <button className="bt3 direita" onClick={() => setFiltroAberto((a) => !a)} aria-expanded={filtroAberto}>
          <Icone nome="filtro" /> Filtro
        </button>
      </div>
      {filtroAberto && (
        <div className="chips" style={{ marginBottom: 20 }}>
          <span className="fraco" style={{ alignSelf: "center", marginRight: 4 }}>Atenção</span>
          {[["qualquer", "Qualquer"], ["leve", "50 mil+"], ["media", "200 mil+"], ["forte", "1 mi+"]].map(([k, r]) => (
            <button key={k} className="chip" aria-pressed={prova === k} onClick={() => mudar({ prova: k === "qualquer" ? null : k })}>{r}</button>
          ))}
          <span className="fraco" style={{ alignSelf: "center", margin: "0 4px 0 12px" }}>Idioma</span>
          {[["", "Todos"], ["pt", "Português"], ["en", "Inglês"]].map(([k, r]) => (
            <button key={k || "todos"} className="chip" aria-pressed={idioma === k} onClick={() => mudar({ idioma: k || null })}>{r}</button>
          ))}
        </div>
      )}
      {gratis && <FaixaPro />}
      {carregando && !dados ? (
        <div className="grade-videos">{Array.from({ length: 10 }, (_, i) => <div key={i} className="esqueleto" style={{ aspectRatio: "9/16" }} />)}</div>
      ) : dados?.itens.length ? (
        <>
          <p className="fraco" style={{ marginBottom: 14, fontSize: 14 }}>
            {dados.total.toLocaleString("pt-BR")} vídeos reais da biblioteca. A nota de cada um chega com o avaliador.
          </p>
          <div className="grade-videos">
            {dados.itens.map((v) => (
              <CartaoVideo key={v.id} v={v} aoSalvar={setSalvando} salvo={salvos.has(v.id)} />
            ))}
          </div>
        </>
      ) : (
        <Vazio
          titulo="A biblioteca ainda está vazia."
          texto="Faça um garimpo e os vídeos aparecem aqui, com views, legenda e link."
          acao={<Link href="/garimpo" className="bt1">Fazer o primeiro garimpo</Link>}
        />
      )}
      {salvando && (
        <SalvarEm
          tipo="video"
          id={salvando.id}
          fechar={() => setSalvando(null)}
          aoMudar={(s) => setSalvos((atual) => { const p = new Set(atual); if (s) p.add(salvando.id); else p.delete(salvando.id); return p; })}
        />
      )}
    </>
  );
}
