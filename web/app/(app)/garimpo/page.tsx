"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { iniciarGarimpo, ErroApi } from "@/lib/garimpo";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";

type Fonte = { id: string; nome: string; aberta: boolean; motivo?: string };
type Palavra = { termo: string; idioma: string };
type Nicho = { id: string; rotulo: string };
type Etiqueta = { termo: string; idioma: string | null };

const ICONE_FONTE: Record<string, string> = { tiktok: "tiktok", youtube: "youtube", tiktok_ads: "anuncio", meta_ads: "anuncio", instagram: "reels" };

// Mesmas pistas do servidor (regra 2): sem certeza, fica sem idioma e o servidor busca nos idiomas do garimpo.
function adivinhar(t: string): string | null {
  const pt = (t.match(/[ãõç]|\b(achadinhos?|para|com|que|você|ferramentas?|aplicativo|médicos?|advogados?|clínica|prontuário|salão|agenda|vendas|ia)\b/gi) ?? []).length;
  const en = (t.match(/\b(made me|finds|for|the|with|that|i built|tool|tools|idea|ideas|doctors?|lawyers?|clinic|software|app that|pays|website)\b/gi) ?? []).length;
  if (pt === en) return null;
  return pt > en ? "pt" : "en";
}

export default function MontarGarimpo() {
  const router = useRouter();
  const { eu } = useApp();
  const { dados: fontes } = useApi<Fonte[]>("/api/fontes");
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [texto, setTexto] = useState("");
  const [nicho, setNicho] = useState<string>("");
  const [pagina, setPagina] = useState(0);
  const [idiomas, setIdiomas] = useState<string[]>(["pt", "en"]);
  const [modo, setModo] = useState<"ideia" | "criativo">("ideia");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ mensagem: string; botao?: string } | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const nichoAtivo = nicho || eu?.espaco.nichos[0] || "";
  const { dados: ideias } = useApi<Palavra[]>(`/api/palavras?idiomas=${idiomas.join(",")}&pagina=${pagina}${nichoAtivo ? `&nicho=${nichoAtivo}` : ""}`);

  function adicionar(bruto: string, idioma?: string) {
    const termo = bruto.trim().toLowerCase().replace(/\s+/g, " ");
    if (!termo || etiquetas.some((e) => e.termo === termo) || etiquetas.length >= 20) return;
    setEtiquetas((es) => [...es, { termo, idioma: idioma ?? adivinhar(termo) }]);
  }

  function tecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar(texto);
      setTexto("");
    } else if (e.key === "Backspace" && !texto && etiquetas.length) {
      setEtiquetas((es) => es.slice(0, -1));
    }
  }

  function trocarIdioma(i: number) {
    setEtiquetas((es) => es.map((e, j) => (j === i ? { ...e, idioma: e.idioma === "pt" ? "en" : e.idioma === "en" ? null : "pt" } : e)));
  }

  function escolherPorMim() {
    const livres = (ideias ?? []).filter((p) => !etiquetas.some((e) => e.termo === p.termo));
    livres.sort(() => Math.random() - 0.5).slice(0, 3).forEach((p) => adicionar(p.termo, p.idioma));
  }

  const restantes = eu ? eu.plano.garimpos - eu.uso.garimpos : null;
  const termosFinais = [...etiquetas.map((e) => e.termo), ...(texto.trim() ? [texto.trim().toLowerCase()] : [])];

  async function garimpar() {
    if (!termosFinais.length || enviando) return;
    if (restantes === 1 && !confirm("Este é o seu último garimpo do mês. Quer usar agora?")) return;
    setEnviando(true);
    setErro(null);
    const termos_idioma: Record<string, string> = {};
    for (const e of etiquetas) if (e.idioma) termos_idioma[e.termo] = e.idioma;
    try {
      const id = await iniciarGarimpo({ termos: termosFinais, termos_idioma, fontes: ["tiktok"], idiomas, modo });
      router.push(`/garimpo/${id}`);
    } catch (e) {
      const err = e as ErroApi;
      setErro({ mensagem: err.message, botao: err.dados?.botao });
      setEnviando(false);
    }
  }

  const semGarimpos = restantes !== null && restantes <= 0;

  return (
    <>
      <h1 className="titulo-pagina">Garimpo</h1>
      <p className="sub-pagina">Escolha palavras. O radar busca cada uma no TikTok e mostra os vídeos chegando ao vivo.</p>

      <div className="montar" style={{ marginTop: 28 }}>
        <section className="painel">
          <label className="secao-titulo" htmlFor="palavras" style={{ marginTop: 0 }}>Palavras</label>
          <div className="etiquetas" onClick={() => campo.current?.focus()}>
            {etiquetas.map((e, i) => (
              <span key={e.termo} className="etiqueta">
                {e.termo}
                <button
                  type="button"
                  className="idioma"
                  style={{ width: "auto", padding: "0 4px" }}
                  onClick={(ev) => { ev.stopPropagation(); trocarIdioma(i); }}
                  title="Idioma da busca (clique para trocar)"
                  aria-label={`Idioma de ${e.termo}: ${e.idioma ?? "automático"}. Trocar`}
                >
                  {e.idioma ?? "auto"}
                </button>
                <button type="button" onClick={(ev) => { ev.stopPropagation(); setEtiquetas((es) => es.filter((_, j) => j !== i)); }} aria-label={`Tirar ${e.termo}`}>
                  <Icone nome="x" tamanho={14} />
                </button>
              </span>
            ))}
            <input
              id="palavras"
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={tecla}
              onBlur={() => { if (texto.includes(",")) { texto.split(",").forEach((t) => adicionar(t)); setTexto(""); } }}
              placeholder={etiquetas.length ? "Mais uma palavra…" : "Ex.: ai for doctors, app para médicos"}
            />
          </div>
          <p className="fraco" style={{ fontSize: 13, marginTop: 8 }}>
            Enter ou vírgula adiciona. Cada palavra é buscada só no idioma dela (pt, en ou auto).
          </p>

          <div className="secao-titulo">
            Ideias de palavras
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button className="bt3 bt-p" onClick={() => setPagina((p) => p + 1)}>Outras ideias</button>
              <button className="bt2 bt-p" onClick={escolherPorMim}><Icone nome="sortear" tamanho={15} /> Escolher por mim</button>
            </span>
          </div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {(nichos ?? []).filter((n) => n.id !== "outro").map((n) => (
              <button key={n.id} className="chip" style={{ height: 30, fontSize: 13 }} aria-pressed={nichoAtivo === n.id} onClick={() => { setNicho(nichoAtivo === n.id ? "" : n.id); setPagina(0); }}>
                {n.rotulo}
              </button>
            ))}
          </div>
          <div className="chips">
            {(ideias ?? []).map((p) => {
              const ja = etiquetas.some((e) => e.termo === p.termo);
              return (
                <button key={p.termo} className="chip" style={{ background: "var(--sunk)", border: "1px solid var(--line)" }} disabled={ja} onClick={() => adicionar(p.termo, p.idioma)}>
                  {ja ? <Icone nome="check" tamanho={14} /> : <Icone nome="mais" tamanho={14} />} {p.termo}
                  <span className="mono fraco" style={{ fontSize: 11, textTransform: "uppercase" }}>{p.idioma}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="painel">
          <div className="secao-titulo" style={{ marginTop: 0 }}>Onde buscar</div>
          <div className="fontes">
            {(fontes ?? []).map((f) => (
              <div key={f.id} className="fonte" aria-pressed={f.aberta} aria-disabled={!f.aberta}>
                <span className="icone-fonte"><Icone nome={ICONE_FONTE[f.id] ?? "play"} /></span>
                <span style={{ flex: 1 }}>
                  <span className="nome">{f.nome}</span>
                  {!f.aberta && <span className="motivo" style={{ display: "block" }}>{f.motivo}</span>}
                </span>
                {f.aberta ? <Icone nome="check" /> : <Icone nome="cadeado" tamanho={16} />}
              </div>
            ))}
          </div>

          <div className="secao-titulo">Idioma</div>
          <div className="chips">
            {[["pt", "Português"], ["en", "Inglês"]].map(([k, r]) => (
              <button
                key={k}
                className="chip"
                aria-pressed={idiomas.includes(k)}
                onClick={() => setIdiomas((ids) => (ids.includes(k) ? (ids.length > 1 ? ids.filter((x) => x !== k) : ids) : [...ids, k]))}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="secao-titulo">Para</div>
          <div className="chips">
            <button className="chip" aria-pressed={modo === "ideia"} onClick={() => setModo("ideia")}>Achar ideia</button>
            <button className="chip" aria-pressed={modo === "criativo"} onClick={() => setModo("criativo")}>Achar criativo</button>
          </div>
          <p className="fraco" style={{ fontSize: 13, marginTop: 12 }}>
            {modo === "ideia" ? "Em alta · 200 mil+ views · subindo · 2+ criadores" : "Atenção média · gancho forte · vertical · 4 a 60 s"}
          </p>

          <div className="divisor" />
          {erro && (
            <div className="erro-caixa" role="alert" style={{ marginBottom: 12 }}>
              {erro.mensagem}
            </div>
          )}
          <div className="acao-fixa">
            {semGarimpos || erro?.botao ? (
              <Link href="/config#plano" className="bt1 bt-g" style={{ width: "100%" }}>Assinar o Pro</Link>
            ) : (
              <button className="bt1 bt-g" style={{ width: "100%" }} onClick={garimpar} disabled={!termosFinais.length || enviando}>
                <Icone nome="radar" /> {enviando ? "Começando…" : "Garimpar"}
              </button>
            )}
          </div>
          {restantes !== null && (
            <p className="fraco" style={{ fontSize: 13, marginTop: 10, textAlign: "center" }}>
              {eu!.uso.garimpos} de {eu!.plano.garimpos} garimpos usados no mês
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
