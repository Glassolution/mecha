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
import { Esteiras } from "@/components/Esteiras";
import { FonteBusca, SeletorCompacto, type OpcaoCompacta } from "@/components/FonteBusca";
import { Revela } from "@/components/Movimento";
import { Pose } from "@/components/Pose";

type Modo = "ideia" | "criativo";

const MODOS: OpcaoCompacta<Modo>[] = [
  { id: "ideia", nome: "Achar ideia", curto: "Ideia", detalhe: "O que criar, pelo que está viralizando", icones: ["ideia"] },
  { id: "criativo", nome: "Achar criativo", curto: "Criativo", detalhe: "Vídeos que vendem, para copiar o formato", icones: ["claquete"] },
];

type Sugestao = { termo: string; t: string; icone: string };

/** Abas de sugestões: cada linha mostra uma frase e, ao clicar, põe o termo na caixa. */
const ABAS_SUGESTAO: { id: string; nome: string; icone: string; itens: Sugestao[] }[] = [
  { id: "sugeridos", nome: "Sugeridos", icone: "ideia", itens: [
    { termo: "app para médicos", t: "Apps que médicos estão usando para atender melhor.", icone: "pessoas" },
    { termo: "ia para advogados", t: "IA que está viralizando entre advogados.", icone: "maleta" },
    { termo: "sites que ninguém conhece", t: "Sites pouco conhecidos que estão bombando.", icone: "globo" },
  ] },
  { id: "saude", nome: "Saúde", icone: "coracao", itens: [
    { termo: "app para médicos", t: "Agenda e prontuário para clínicas e consultórios.", icone: "pessoas" },
    { termo: "app para dentistas", t: "Ferramentas que dentistas mostram no dia a dia.", icone: "coracao" },
    { termo: "app para academia", t: "Treinos e cobrança para academias e personal.", icone: "raio" },
  ] },
  { id: "juridico", nome: "Jurídico", icone: "maleta", itens: [
    { termo: "ia para advogados", t: "IA que escreve petições e resume processos.", icone: "maleta" },
    { termo: "app para contadores", t: "Automação para escritórios de contabilidade.", icone: "planilha" },
    { termo: "gestão de contratos", t: "Contratos com assinatura e lembrete de prazo.", icone: "cadeado" },
  ] },
  { id: "imoveis", nome: "Imóveis", icone: "inicio", itens: [
    { termo: "ia para corretor de imóveis", t: "IA que atende clientes e agenda visitas.", icone: "inicio" },
    { termo: "app para imobiliárias", t: "Vitrine de imóveis e controle de leads.", icone: "grafico" },
    { termo: "gestão de aluguel", t: "Cobrança de aluguel e repasse automático.", icone: "relogio" },
  ] },
  { id: "criadores", nome: "Criadores", icone: "claquete", itens: [
    { termo: "eu criei um app", t: "Criadores mostrando o app que fizeram.", icone: "claquete" },
    { termo: "ferramentas de ia que você precisa", t: "Listas de ferramentas de IA que viralizam.", icone: "foguete" },
    { termo: "ia que faz o seu trabalho", t: "IA que faz tarefas chatas no lugar da pessoa.", icone: "raio" },
  ] },
];

export default function Pesquisa() {
  const router = useRouter();
  const { fontes, escolha: escolhaFonte, escolher: escolherFonte } = useFontes();
  const { eu, pronto } = useApp();
  // o Início abre sem login: números e vídeos em alta vêm das rotas públicas
  const { dados: alta } = useApi<{ itens: Video[] }>("/api/publico/em-alta?limite=90");
  const [texto, setTexto] = useState("");
  const [modoEscolhido, setModo] = useState<Modo | null>(null);
  const modo: Modo = modoEscolhido ?? (eu?.espaco.interesse === "achar_criativo" ? "criativo" : "ideia");
  const [estado, setEstado] = useState<"parado" | "enviando" | "lancando">("parado");
  const [erro, setErro] = useState<{ mensagem: string; botao?: string } | null>(null);
  const [verSugestoes, setVerSugestoes] = useState(true);
  const [aba, setAba] = useState(ABAS_SUGESTAO[0].id);
  const campo = useRef<HTMLTextAreaElement>(null);
  const termos = separarTermos(texto);
  const abaAtual = ABAS_SUGESTAO.find((a) => a.id === aba) ?? ABAS_SUGESTAO[0];

  // O radar prepara o tema; a pesquisa só é executada quando a pessoa envia.
  useEffect(() => {
    const nicho = new URLSearchParams(location.search).get("nicho")?.trim().slice(0, 160);
    if (!nicho) return;
    const tempo = setTimeout(() => { setTexto(nicho); campo.current?.focus(); }, 0);
    return () => clearTimeout(tempo);
  }, []);

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
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [texto]);

  async function garimpar(entrada: string = texto, m: Modo = modo) {
    const lista = separarTermos(entrada);
    if (!lista.length || estado !== "parado") return;
    if (!eu) {
      if (!pronto) return;
      // visitante: guarda a busca e pede login; ela roda sozinha depois
      guardarBusca({ texto: entrada, modo: m });
      router.push(`/entrar?modo=criar&motivo=busca&proximo=${encodeURIComponent("/pesquisa?continuar=1")}`);
      return;
    }
    setEstado("enviando");
    setErro(null);
    try {
      const id = await iniciarGarimpo({ termos: lista, modo: m, fontes, idiomas: ["pt"] }); // por enquanto, só Brasil
      setEstado("lancando");
      setTimeout(() => router.push(`/garimpo/${id}?nova=1`), 420);
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
    history.replaceState(null, "", "/pesquisa");
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

  function usarSugestao(termo: string) {
    setTexto(termo);
    campo.current?.focus();
  }

  return (
    <div className="ini">
      <div className="ini-fundo" aria-hidden="true" />

      <section className="ini-heroi">
        <Revela i={0} className="ini-cartaz">
          <h1 className="ini-cartaz-titulo">Grandes <b>ideias</b> começam com <b>curiosidade</b></h1>
          <Pose nome="acenando" largura={150} className="ini-cartaz-bru" />
        </Revela>

        <Revela i={1} className="ini-caixa-envoltorio">
          <form className={`ini-caixa ${estado === "lancando" ? "lancando" : ""}`} onSubmit={(e) => { e.preventDefault(); garimpar(); }}>
            <label className="oculto" htmlFor="ini-texto">Um nicho ou problema</label>
            <textarea
              id="ini-texto"
              ref={campo}
              rows={1}
              value={texto}
              placeholder="O que você quer achar hoje?"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  garimpar();
                }
              }}
            />
            <div className="ini-caixa-barra">
              <div className="ini-caixa-esq">
                <SeletorCompacto<Modo> rotulo="O que achar" opcoes={MODOS} valor={modo} mudar={setModo} />
                <button type="button" className="ini-chip-sugestoes" aria-pressed={verSugestoes} aria-controls="ini-sugestoes" onClick={() => setVerSugestoes((v) => !v)}>
                  <Icone nome="ideia" tamanho={17} traco={1.7} /> Sugestões
                </button>
              </div>
              <div className="ini-caixa-dir">
                <FonteBusca valor={escolhaFonte} mudar={escolherFonte} />
                <button className="ini-caixa-enviar" disabled={!termos.length || estado !== "parado"} aria-label="Garimpar" title="Garimpar">
                  {estado === "parado" ? <Icone nome="direita" tamanho={19} traco={2} /> : <span className="girando" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </form>
        </Revela>

        {verSugestoes && (
          <Revela i={2} className="ini-sugestoes">
            <div id="ini-sugestoes" className="ini-sugestoes-abas" role="tablist" aria-label="Tipos de sugestão">
              {ABAS_SUGESTAO.map((a) => (
                <button key={a.id} type="button" role="tab" aria-selected={a.id === aba} className="ini-sugestoes-aba" onClick={() => setAba(a.id)}>
                  <Icone nome={a.icone} tamanho={17} traco={1.6} /> {a.nome}
                </button>
              ))}
            </div>
            <ul className="ini-sugestoes-lista" role="tabpanel">
              {abaAtual.itens.map((s) => (
                <li key={s.termo}>
                  <button type="button" className="ini-sugestoes-item" onClick={() => usarSugestao(s.termo)}>
                    <Icone nome={s.icone} tamanho={18} traco={1.6} />
                    <span>{s.t}</span>
                    <Icone nome="direita" tamanho={18} traco={1.8} />
                  </button>
                </li>
              ))}
            </ul>
          </Revela>
        )}

        {erro && (
          <div className="erro-caixa" role="alert" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <span>{erro.mensagem}</span>
            {erro.botao && <Link href="/config#plano" className="bt1 bt-p">{erro.botao}</Link>}
          </div>
        )}
      </section>

      {alta && alta.itens.length > 0 && <Esteiras videos={alta.itens} />}
      <footer className="ini-footer"><span>Menos ruído. Mais possibilidades.</span><span>Feito para quem cria o próximo passo. ↗</span></footer>
    </div>
  );
}
