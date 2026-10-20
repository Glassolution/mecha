"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { esquecerBusca, guardarBusca, lerBusca } from "@/lib/buscaPendente";
import { useFontes } from "@/lib/fontes";
import { iniciarGarimpo, separarTermos, ErroApi } from "@/lib/garimpo";
import type { Video } from "@/lib/tipos";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { Mascote } from "@/components/Mascote";
import { Esteiras } from "@/components/Esteiras";
import { FonteBusca, SeletorCompacto, type OpcaoCompacta } from "@/components/FonteBusca";
import { Revela, TituloAnimado } from "@/components/Movimento";

type UltimoGarimpo = { id: string; termos: string[]; status: string; vistos: number };
type Modo = "ideia" | "criativo";

const MODOS: OpcaoCompacta<Modo>[] = [
  { id: "ideia", nome: "Achar ideia", curto: "Ideia", detalhe: "O que criar, pelo que está viralizando", icones: ["ideia"] },
  { id: "criativo", nome: "Achar criativo", curto: "Criativo", detalhe: "Vídeos que vendem, para copiar o formato", icones: ["claquete"] },
];

const EXEMPLOS: Record<Modo, string[]> = {
  ideia: ["app para advogados", "ia para corretor de imóveis", "agenda de salão", "ia para professores", "app para médicos", "app de finanças"],
  criativo: ["eu criei um app", "ferramentas de ia que você precisa", "sites que ninguém conhece", "ia que faz o seu trabalho", "ferramenta de ia"],
};
// textura de caracteres atrás da caixa de busca (sempre a mesma, para não mudar entre servidor e navegador)
const ASCII = (() => {
  const sinais = " .:-=+*xX#";
  let n = 7;
  const linhas: string[] = [];
  for (let l = 0; l < 9; l++) {
    let linha = "";
    for (let c = 0; c < 150; c++) {
      n = (n * 1103515245 + 12345) % 2147483648;
      const borda = Math.min(c, 149 - c) / 75; // mais denso nas pontas, quase vazio no meio
      linha += sinais[Math.floor(((n / 2147483648) * (1 - borda * 0.85)) * sinais.length)];
    }
    linhas.push(linha);
  }
  return linhas.join("\n");
})();

const SUGESTOES = ["app para médicos", "ia para advogados", "eu criei um app", "sites que ninguém conhece", "ia para corretor de imóveis"];

/** Exemplos sendo digitados e apagados no lugar do texto de ajuda. */
function useDigitando(frases: string[], ativo: boolean) {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (!ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setTexto(frases[0]), 0);
      return () => clearTimeout(t);
    }
    let i = 0, n = 0, apagando = false, t: ReturnType<typeof setTimeout>;
    const passo = () => {
      const frase = frases[i % frases.length];
      if (!apagando) {
        n++;
        setTexto(frase.slice(0, n));
        if (n === frase.length) { apagando = true; t = setTimeout(passo, 1800); return; }
        t = setTimeout(passo, 55 + Math.random() * 45);
      } else {
        n--;
        setTexto(frase.slice(0, n));
        if (n === 0) { apagando = false; i++; t = setTimeout(passo, 350); return; }
        t = setTimeout(passo, 25);
      }
    };
    t = setTimeout(passo, 600);
    return () => clearTimeout(t);
  }, [frases, ativo]);
  return texto;
}

/** Brilho que segue o cursor dentro de um elemento. */
// grade do fundo: blocos parados, bem sutis
const BLOCOS = Array.from({ length: 40 }, (_, i) => <i key={i} />);

function brilhoQueSegue(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function Inicio() {
  const router = useRouter();
  const { fontes, escolha: escolhaFonte, escolher: escolherFonte } = useFontes();
  const { eu, pronto } = useApp();
  // o Início abre sem login: números e vídeos em alta vêm das rotas públicas
  const { dados: alta } = useApi<{ itens: Video[] }>("/api/publico/em-alta?limite=90");
  const { dados: ultimos } = useApi<UltimoGarimpo[]>(eu ? "/api/garimpos?limite=1" : null);
  const ultimo = ultimos?.[0] ?? null;
  const [texto, setTexto] = useState("");
  const [modoEscolhido, setModo] = useState<Modo | null>(null);
  const modo: Modo = modoEscolhido ?? (eu?.espaco.interesse === "achar_criativo" ? "criativo" : "ideia");
  const [estado, setEstado] = useState<"parado" | "enviando" | "lancando">("parado");
  const [pulando, setPulando] = useState(false);
  const [erro, setErro] = useState<{ mensagem: string; botao?: string } | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const exemplo = useDigitando(EXEMPLOS[modo], texto.length === 0);
  const termos = separarTermos(texto);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  // a caixa cresce com o texto
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [texto]);

  async function garimpar(entrada: string = texto, m: Modo = modo) {
    const lista = separarTermos(entrada);
    if (!lista.length || estado !== "parado") return;
    if (!eu) {
      if (!pronto) return;
      // visitante: guarda a busca e pede login; ela roda sozinha depois
      guardarBusca({ texto: entrada, modo: m });
      router.push(`/entrar?modo=criar&motivo=busca&proximo=${encodeURIComponent("/inicio?continuar=1")}`);
      return;
    }
    setEstado("enviando");
    setErro(null);
    try {
      const id = await iniciarGarimpo({ termos: lista, modo: m, fontes, idiomas: eu.espaco.ver_ingles === false ? ["pt"] : ["pt", "en"] });
      setEstado("lancando");
      setTimeout(() => router.push(`/garimpo/${id}`), 420);
    } catch (e) {
      const err = e as ErroApi;
      setErro({ mensagem: err.message, botao: err.dados?.botao });
      setEstado("parado");
    }
  }

  // depois do login (e do quiz), a busca que o visitante tinha digitado roda sozinha
  const continuou = useRef(false);
  useEffect(() => {
    if (!eu || !eu.espaco.boas_vindas_ok || continuou.current) return;
    if (!new URLSearchParams(location.search).has("continuar")) return;
    continuou.current = true;
    history.replaceState(null, "", "/inicio");
    const pendente = lerBusca();
    esquecerBusca();
    if (!pendente) return;
    const t = setTimeout(() => {
      setTexto(pendente.texto);
      setModo(pendente.modo);
      garimpar(pendente.texto, pendente.modo);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eu]);

  function usarSugestao(s: string) {
    setTexto((t) => (t.trim() ? `${t.trim().replace(/,$/, "")}, ${s}` : s));
    campo.current?.focus();
  }


  return (
    <div className="ini">
      <div className="ini-fundo" aria-hidden="true">
        <div className="ini-grade">{BLOCOS}</div>
      </div>

      <section className="ini-centro">
        <button
          type="button"
          className={["ini-mascote", texto ? "lendo" : "", estado !== "parado" ? "decola" : "", pulando ? "pula" : ""].filter(Boolean).join(" ")}
          onClick={() => {
            if (pulando) return;
            setPulando(true);
            setTimeout(() => setPulando(false), 900);
          }}
          aria-label="Mascote da mecha"
        >
          <Mascote tamanho={78} />
        </button>

        <TituloAnimado className="ini-titulo" texto="O que você quer achar hoje?" />
        <Revela as="p" className="ini-sub" i={5}>
          Escreva um nicho ou um problema. A mecha busca no TikTok e no Instagram, aqui e lá fora, e mostra o que está viralizando, ao vivo.
        </Revela>

        <Revela i={6} className="ini-compositor-envoltorio">
          <pre className="ini-ascii" aria-hidden="true">{ASCII}</pre>
          <form
            className={`ini-compositor ${estado === "lancando" ? "lancando" : ""}`}
            onSubmit={(e) => { e.preventDefault(); garimpar(); }}
            onPointerMove={brilhoQueSegue}
          >
            <div className="ini-campo">
              <label className="oculto" htmlFor="ini-texto">Um nicho ou problema</label>
              <textarea
                id="ini-texto"
                ref={campo}
                rows={1}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    garimpar();
                  }
                }}
              />
              {!texto && (
                <span className="ini-exemplo" aria-hidden="true">
                  <span className="fraco">Ex.: </span>{exemplo}<i className="cursor" />
                </span>
              )}
            </div>
            <div className="ini-acoes">
              <SeletorCompacto<Modo> rotulo="O que achar" opcoes={MODOS} valor={modo} mudar={setModo} />
              <FonteBusca valor={escolhaFonte} mudar={escolherFonte} />
              {termos.length > 1 && <span className="ini-contagem">{termos.length} palavras</span>}
              <button className={`ini-enviar ${estado !== "parado" ? "carregando" : ""}`} disabled={!termos.length || estado !== "parado"} aria-label="Garimpar">
                {estado === "parado" ? <>Garimpar <Icone nome="direita" tamanho={15} traco={2.2} /></> : <><span className="girando" aria-hidden="true" /> Garimpando</>}
              </button>
            </div>
          </form>
        </Revela>

        <Revela className="ini-sugestoes" i={7}>
          <span className="ini-sugestoes-rotulo">Experimente</span>
          {SUGESTOES.map((s, i) => (
            <button key={s} type="button" className="ini-sugestao" onClick={() => usarSugestao(s)} style={{ "--i": i } as React.CSSProperties}>
              {s}
              <Icone nome="diagonal" tamanho={11} traco={2} />
            </button>
          ))}
        </Revela>
        <p className="ini-dica">
          <span><kbd aria-label="tecla de confirmar">⏎</kbd> garimpar</span>
          <span><kbd aria-label="tecla de maiúscula">⇧</kbd><kbd aria-label="tecla de confirmar">⏎</kbd> nova linha</span>
          <span><kbd>/</kbd> escrever</span>
          <span>vírgula separa palavras</span>
        </p>
        {erro && (
          <div className="erro-caixa" role="alert" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <span>{erro.mensagem}</span>
            {erro.botao && <Link href="/config#plano" className="bt1 bt-p">{erro.botao}</Link>}
          </div>
        )}
      </section>

      {alta && <Esteiras videos={alta.itens} />}

      <section className="ini-proximos" aria-label="Próximos passos">
        {[
          { href: "/ideias", icone: "sobe", t: "Ideias em alta", d: "SaaS que estão ganhando atenção agora, por nicho." },
          { href: "/ideias?prateleira=fora", icone: "ideia", t: "Bombando lá fora", d: "Ideias que crescem em inglês e ainda não têm versão no Brasil." },
          ultimo
            ? { href: `/garimpo/${ultimo.id}`, icone: "radar", t: "Continuar o último garimpo", d: `“${ultimo.termos.slice(0, 3).join("”, “")}” · ${ultimo.vistos} vídeos` }
            : { href: "/garimpo", icone: "radar", t: "Montar um garimpo", d: "Escolha várias palavras e fontes de uma vez." },
        ].map((c, i) => (
          <Revela as={Link} key={c.t} href={c.href} className="ini-proximo" i={i} onPointerMove={brilhoQueSegue}>
            <span className="ini-proximo-icone"><Icone nome={c.icone} tamanho={18} /></span>
            <b>{c.t}</b>
            <span>{c.d}</span>
            <span className="ini-seta"><Icone nome="direita" tamanho={16} /></span>
          </Revela>
        ))}
      </section>
    </div>
  );
}
