"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api, limparCache } from "@/lib/api";
import { capaUrl, num } from "@/lib/fmt";
import type { Garimpo, Video } from "@/lib/tipos";
import { primeiraLinha, Vazio } from "@/components/Cartoes";
import { EscolhaVideo, rotaAssistir } from "@/components/EscolhaVideo";
import { EstadoBusca } from "@/components/EstadoBusca";
import { CarregandoResultados, CartaoResultadoEsqueleto, GradeResultadosEsqueleto } from "@/components/EsqueletosResultados";
import { Icone } from "@/components/Icone";
import { AbasPilula, Suspenso } from "@/components/Movimento";
import { Oportunidades } from "@/components/Oportunidades";
import { PalcoPesquisa } from "@/components/PalcoPesquisa";
import { SalvarEm } from "@/components/SalvarEm";
import { SeloFonte } from "@/components/SeloFonte";

type Ordem = "relevantes" | "em_alta" | "recentes";
type Plataforma = "todas" | "tiktok" | "instagram";
const FONTES_DE_VIDEO = ["tiktok", "instagram"];
type Atencao = "qualquer" | "leve" | "media" | "forte";
type Resultado = Video & { novo?: boolean; chegada: number };

const MINIMO: Record<Atencao, number> = { qualquer: 0, leve: 50_000, media: 200_000, forte: 1_000_000 };


/** Título sem emojis e símbolos soltos no começo ("🎯 Dica rápida…" -> "Dica rápida…"). */
function tituloLimpo(t: string) {
  return t.replace(/^[^\p{L}\p{N}@#"“]+/u, "") || t;
}

/** Cartão de resultado, no estilo de galeria: capa, título, autor e o botão Abrir. */
function CartaoResultado({ v, i, aoSalvar, salvo, origem }: { v: Resultado; i: number; aoSalvar: (v: Video) => void; salvo: boolean; origem: string }) {
  const capa = capaUrl(v.capa);
  const href = rotaAssistir(v.id, origem);
  const [escolhendo, setEscolhendo] = useState(false);
  return (
    <article className={`res-cartao${v.novo ? " novo" : ""}${escolhendo ? " escolhendo" : ""}`} style={{ "--resultado-i": Math.min(i, 7) } as CSSProperties}>
      <button type="button" className="res-thumb" aria-expanded={escolhendo} onClick={() => setEscolhendo((a) => !a)}
        aria-label={`Abrir: ${primeiraLinha(v.texto)}`}>
        {capa ? <img src={capa} alt="" loading="lazy" /> : <span className="capa-vazia" />}
        <span className="res-selos">
          <span className="res-views"><Icone nome="olho" tamanho={13} /> {num(v.views)}</span>
          {v.views_dia ? <span className="res-dia"><Icone nome="sobe" tamanho={12} /> {num(v.views_dia)}/dia</span> : null}
        </span>
      </button>
      {escolhendo && <EscolhaVideo id={v.id} origem={origem} fechar={() => setEscolhendo(false)} />}
      <button className="res-salvar" aria-pressed={salvo} aria-label={salvo ? "Salvo. Mudar coleção" : "Salvar"} onClick={() => aoSalvar(v)}>
        <Icone nome={salvo ? "check" : "salvo"} tamanho={15} />
      </button>
      <div className="res-meta">
        <div className="res-txt">
          <b title={v.texto}>{tituloLimpo(primeiraLinha(v.texto))}</b>
          <span className="res-autor">
            <SeloFonte fonte={v.fonte} soIcone />
            <span className="res-autor-txt">{v.autor}</span>
          </span>
        </div>
        <Link href={href} className="res-abrir">Abrir <Icone nome="diagonal" tamanho={13} /></Link>
      </div>
    </article>
  );
}

export default function ResultadosDoGarimpo() {
  const { id } = useParams<{ id: string }>();
  const [nova] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nova") === "1");
  const [g, setG] = useState<Garimpo | null>(null);
  const [videos, setVideos] = useState<Resultado[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState<string | null>(null);
  const [parando, setParando] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>("relevantes");
  const [plataforma, setPlataforma] = useState<Plataforma>("todas");
  const [atencao, setAtencao] = useState<Atencao>("qualquer");
  const [salvando, setSalvando] = useState<Video | null>(null);
  const [salvos, setSalvos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!nova) return;
    const endereco = new URL(window.location.href);
    endereco.searchParams.delete("nova");
    window.history.replaceState(window.history.state, "", endereco.pathname + endereco.search + endereco.hash);
  }, [nova]);

  // todos os vídeos já guardados deste garimpo + os que chegam ao vivo
  useEffect(() => {
    let contador = 0;
    const juntar = (novos: Video[], marcarNovo: boolean) =>
      setVideos((vs) => {
        const ids = new Set(vs.map((v) => v.id));
        const extra = novos.filter((v) => !ids.has(v.id)).map((v) => ({ ...v, novo: marcarNovo, chegada: contador++ }));
        return extra.length ? [...vs, ...extra] : vs;
      });

    api<Video[]>(`/api/garimpos/${id}/videos`).then((vs) => juntar(vs, false)).catch(() => {});

    const fonte = new EventSource(`/api/garimpos/${id}/fluxo`);
    const ler = (e: Event) => JSON.parse((e as MessageEvent).data);
    fonte.addEventListener("retrato", (e) => {
      const d = ler(e);
      setG(d.garimpo);
      juntar(d.videos, false);
    });
    fonte.addEventListener("fonte", (e) => {
      const { fonte: f, ...estado } = ler(e);
      setG((x) => (x ? { ...x, por_fonte: { ...x.por_fonte, [f]: estado } } : x));
    });
    fonte.addEventListener("agora", (e) => setG((x) => (x ? { ...x, agora: ler(e).texto } : x)));
    fonte.addEventListener("status", (e) => setG((x) => (x ? { ...x, status: ler(e).status } : x)));
    fonte.addEventListener("contagens", (e) => setG((x) => (x ? { ...x, ...ler(e) } : x)));
    fonte.addEventListener("chegou", (e) => juntar(ler(e).videos, true));
    fonte.addEventListener("fim", (e) => {
      setG((x) => (x ? { ...x, ...ler(e), agora: null, fim_em: new Date().toISOString() } : x));
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

  const lista = useMemo(() => {
    const filtrados = videos.filter(
      (v) => (plataforma === "todas" || v.fonte === plataforma) && (v.views ?? 0) >= MINIMO[atencao],
    );
    const porData = (v: Video) => (v.publicado ? new Date(v.publicado).getTime() : 0);
    const ordenar: Record<Ordem, (a: Resultado, b: Resultado) => number> = {
      relevantes: (a, b) => (b.views ?? 0) - (a.views ?? 0),
      em_alta: (a, b) => (b.views_dia ?? 0) - (a.views_dia ?? 0),
      recentes: (a, b) => porData(b) - porData(a),
    };
    // enquanto busca, os que acabaram de chegar ficam no fim para a grade não pular
    return ativo ? [...filtrados].sort((a, b) => a.chegada - b.chegada) : [...filtrados].sort(ordenar[ordem]);
  }, [videos, plataforma, atencao, ordem, ativo]);

  async function parar() {
    setParando(true);
    setErro(null);
    try {
      await api(`/api/garimpos/${id}/parar`, { method: "POST" });
    } catch (e) {
      setErro((e as Error).message || "Não foi possível encerrar a pesquisa. Tente novamente.");
    } finally {
      setParando(false);
    }
  }

  if (erro && !g) return <Vazio titulo="Não deu para abrir esta busca." texto={erro} acao={<Link className="bt1" href="/pesquisa">Nova busca</Link>} />;
  if (!g) return <CarregandoResultados />;

  const segundos = Math.max(0, ((ativo ? agora : g.fim_em ? new Date(g.fim_em).getTime() : agora) - new Date(g.criado_em).getTime()) / 1000);
  // o estado da busca junta as fontes de vídeo do garimpo (TikTok, Instagram)
  const fontesDoGarimpo = g.fontes.filter((f) => FONTES_DE_VIDEO.includes(f));
  const estados = fontesDoGarimpo.map((f) => g.por_fonte[f]).filter(Boolean);
  const buscandoAgora = estados.find((e) => e.status === "buscando");
  const comErro = estados.length > 0 && estados.every((e) => e.status === "erro");
  const detalheErro = estados.find((e) => e.status === "erro")?.detalhe;
  const filtrado = plataforma !== "todas" || atencao !== "qualquer";
  const quantos = (f: Plataforma) => (f === "todas" ? videos.length : videos.filter((v) => v.fonte === f).length);
  const ferramentas = g.fontes.map((fonte) => ({ fonte, ...g.por_fonte[fonte], status: g.por_fonte[fonte]?.status ?? "na_fila" }));

  return (
    <>
      <PalcoPesquisa revelar cabecalho={<header className="res-topo">
        <Link href="/pesquisa" className="res-voltar" aria-label="Nova busca"><Icone nome="voltar" tamanho={18} /></Link>
        <div className={`res-busca${ativo ? " ativa" : ""}`}>
          <Icone nome="busca" tamanho={18} />
          <span className="res-termos">
            {g.termos.map((t) => <span key={t} className="res-termo">{t}</span>)}
          </span>
        </div>
        <Link href="/pesquisa" className="bt2 bt-p res-nova"><Icone nome="mais" tamanho={15} /> Nova busca</Link>
      </header>}

      atividade={(compacta) => <div className="res-estado">
        <EstadoBusca
          estado={ativo ? "buscando" : comErro ? "erro" : g.status === "parado" ? "parado" : "concluido"}
          termo={buscandoAgora?.termo ?? g.termos[0] ?? null}
          quantos={ativo ? videos.length : g.vistos}
          transcritos={g.transcritos}
          segundos={segundos}
          atividade={g.agora}
          aguardando={g.status === "aguardando"}
          fontes={ferramentas}
          detalhe={detalheErro}
          parando={parando}
          aoParar={parar}
          compacto={compacta}
        />
      </div>}
      aviso={erro ? <p className="erro-caixa" role="alert" style={{ marginTop: 16 }}>{erro}</p> : null}>

      {g.status === "concluido" && g.vistos > 0 && <Oportunidades garimpoId={id} />}

      <div className="barra-x res-barra">
        <AbasPilula<Ordem>
          rotulo="Ordem"
          valor={ordem}
          mudar={setOrdem}
          opcoes={[["relevantes", "Relevantes"], ["em_alta", "Em alta"], ["recentes", "Recentes"]]}
        />
        <div className="direita">
          {fontesDoGarimpo.length > 1 && (
            <AbasPilula<Plataforma>
              rotulo="Fonte"
              valor={plataforma}
              mudar={setPlataforma}
              opcoes={[["todas", `Todas ${quantos("todas")}`], ["tiktok", `TikTok ${quantos("tiktok")}`], ["instagram", `Instagram ${quantos("instagram")}`]]}
            />
          )}
          <Suspenso<Atencao>
            rotulo="Atenção mínima"
            valor={atencao}
            mudar={setAtencao}
            opcoes={[["qualquer", "Atenção"], ["leve", "50 mil+ views"], ["media", "200 mil+ views"], ["forte", "1 mi+ views"]]}
          />
        </div>
      </div>

      {lista.length === 0 && ativo ? (
        <GradeResultadosEsqueleto />
      ) : lista.length === 0 ? (
        <Vazio
          titulo={filtrado ? "Nenhum vídeo com esse filtro." : g.fracos ? "Nenhum vídeo com potencial de SaaS." : "Nenhum vídeo nesta busca."}
          texto={filtrado ? "Tire um filtro para ver todos." : g.fracos
            ? `Os ${g.fracos} vídeos encontrados eram de entretenimento ou sem um público com dores para resolver. Tente uma palavra ligada a trabalho ou negócio.`
            : "Tente outra palavra."}
          acao={<Link href="/pesquisa" className="bt1">Nova busca</Link>}
        />
      ) : (
        <div className="res-grade" aria-busy={ativo}>
          {lista.map((v, n) => (
            <CartaoResultado key={v.id} v={v} i={n % 12} aoSalvar={setSalvando} salvo={salvos.has(v.id)} origem={`/garimpo/${id}`} />
          ))}
          {ativo && Array.from({ length: lista.length ? 4 - (lista.length % 4) || 4 : 8 }, (_, i) => (
            <CartaoResultadoEsqueleto key={`espera-${i}`} />
          ))}
        </div>
      )}

      {!ativo && lista.length > 0 && !!g.fracos && (
        <p className="res-fracos">
          {g.fracos === 1 ? "1 vídeo sem potencial de SaaS ficou de fora" : `${g.fracos} vídeos sem potencial de SaaS ficaram de fora`} (entretenimento, memes, jogos e parecidos).
        </p>
      )}

      </PalcoPesquisa>
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
