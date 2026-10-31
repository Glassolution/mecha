"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, useApi } from "@/lib/api";
import type { Video } from "@/lib/tipos";
import { CartaoVideo, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { BandeiraIdioma } from "@/components/BandeiraIdioma";
import { AbasPilula, Revela, Suspenso, TituloAnimado } from "@/components/Movimento";
import { SalvarEm } from "@/components/SalvarEm";

type Nicho = { id: string; rotulo: string };
type Prateleira = "em_alta" | "vistas" | "salvos";
type Atencao = "qualquer" | "leve" | "media" | "forte";
type Lingua = "pt" | "en" | "todos";
type Pagina = { total: number; itens: Video[] };

const POR_PAGINA = 24;
const GRUPOS: [string, string[]][] = [
  ["Negócios", ["vendas_marketing", "financas", "juridico", "rh"]],
  ["Criação", ["conteudo", "produtividade", "dev"]],
  ["Setores", ["saude", "educacao", "imobiliario", "ecommerce"]],
  ["Dia a dia", ["servicos_locais", "vida_pessoal"]],
];
// cada prateleira vira uma ordem da biblioteca
const ORDEM: Record<Prateleira, string> = { em_alta: "em_alta", vistas: "views", salvos: "salvamentos" };

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
  const nicho = sp.get("nicho") ?? "";
  const prateleira = (sp.get("prateleira") as Prateleira) in ORDEM ? (sp.get("prateleira") as Prateleira) : "em_alta";
  const atencao = (sp.get("atencao") as Atencao) || "qualquer";
  const lingua = (sp.get("idioma") as Lingua) || "pt";
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [salvando, setSalvando] = useState<Video | null>(null);
  const [salvos, setSalvos] = useState<Set<string>>(new Set());
  const [mais, setMais] = useState<{ caminho: string; itens: Video[] }>({ caminho: "", itens: [] });
  const [buscandoMais, setBuscandoMais] = useState(false);

  const q = new URLSearchParams({ so_potencial: "true", ordem: ORDEM[prateleira], prova: atencao, idioma: lingua, limite: String(POR_PAGINA),
    ...(nicho ? { nichos: nicho } : {}) });
  const caminho = `/api/videos?${q}`;
  const { dados, carregando } = useApi<Pagina>(caminho);
  // "Ver mais" vale só para o filtro em que foi pedido; trocar de filtro recomeça a lista
  const videos = [...(dados?.itens ?? []), ...(mais.caminho === caminho ? mais.itens : [])];
  const rotulo = (id: string) => nichos?.find((n) => n.id === id)?.rotulo ?? id;

  function mudar(params: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function carregarMais() {
    setBuscandoMais(true);
    try {
      const pagina = Math.floor(videos.length / POR_PAGINA);
      const r = await api<Pagina>(`${caminho}&pagina=${pagina}`);
      setMais((m) => ({ caminho, itens: [...(m.caminho === caminho ? m.itens : []), ...r.itens] }));
    } finally {
      setBuscandoMais(false);
    }
  }

  return (
    <>
      <section className="hero-x">
        <TituloAnimado className="titulo-x" texto="Ainda sem nicho? Comece por aqui" />
        <Revela as="p" className="sub-x" i={4}>Vídeos em alta para inspirar sua próxima ideia de SaaS.</Revela>
      </section>

      <Revela as="nav" className="catalogo-x" aria-label="Filtrar por área">
        {GRUPOS.map(([titulo, ids]) => (
          <div key={titulo}>
            <h3>{titulo}</h3>
            <ul>
              {ids.map((id) => (
                <li key={id}>
                  <button aria-pressed={nicho === id} onClick={() => mudar({ nicho: nicho === id ? null : id })}>{rotulo(id)}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Revela>

      <div className="barra-x">
        <AbasPilula<Prateleira>
          rotulo="Prateleira"
          valor={prateleira}
          mudar={(v) => mudar({ prateleira: v === "em_alta" ? null : v })}
          opcoes={[["em_alta", "Em alta"], ["vistas", "Mais vistas"], ["salvos", "Mais salvos"]]}
        />
        <div className="direita">
          <Suspenso<Lingua>
            rotulo="Idioma dos vídeos"
            valor={lingua}
            mudar={(v) => mudar({ idioma: v === "pt" ? null : v })}
            opcoes={[["pt", "Português"], ["en", "Inglês"], ["todos", "Todos os idiomas"]]}
            icones={{ pt: <BandeiraIdioma idioma="pt" />, en: <BandeiraIdioma idioma="en" />, todos: <BandeiraIdioma idioma="todos" /> }}
          />
          <Suspenso<Atencao>
            rotulo="Atenção mínima"
            valor={atencao}
            mudar={(v) => mudar({ atencao: v === "qualquer" ? null : v })}
            opcoes={[["qualquer", "Atenção"], ["leve", "50 mil+ views"], ["media", "200 mil+ views"], ["forte", "1 mi+ views"]]}
          />
        </div>
      </div>

      {eu?.plano.id === "gratis" && (
        <div className="faixa">
          <span className="selo selo-novo">PRO</span>
          <span>O plano grátis mostra os primeiros vídeos — <Link href="/config#plano">Assinar o Pro</Link></span>
        </div>
      )}

      {carregando && !dados ? (
        <div className="grade-videos">{Array.from({ length: 8 }, (_, i) => <div key={i} className="esqueleto" style={{ aspectRatio: "9 / 16" }} />)}</div>
      ) : videos.length ? (
        <>
          <div className="grade-videos">
            {videos.map((v) => (
              <div key={v.id} className="ideia-video">
                <CartaoVideo v={v} aoSalvar={setSalvando} salvo={salvos.has(v.id)} />
                {!v.bloqueado && v.potencial_motivo && <p className="ideia-motivo" title="Por que este vídeo pode virar SaaS">{v.potencial_motivo}</p>}
              </div>
            ))}
          </div>
          {dados && videos.length < dados.total && (
            <div className="ideias-mais">
              <button className="bt2" onClick={carregarMais} disabled={buscandoMais}>{buscandoMais ? "Carregando…" : "Ver mais vídeos"}</button>
            </div>
          )}
        </>
      ) : (
        <Vazio
          titulo="Nenhum vídeo com esse filtro ainda."
          texto="Tire um filtro ou pesquise palavras dessa área."
          acao={<Link href="/pesquisa" className="bt1">Pesquisar</Link>}
        />
      )}

      {salvando && (
        <SalvarEm
          tipo="video"
          id={salvando.id}
          fechar={() => setSalvando(null)}
          aoMudar={(s) => setSalvos((a) => { const p = new Set(a); if (s) p.add(salvando.id); else p.delete(salvando.id); return p; })}
        />
      )}
    </>
  );
}
