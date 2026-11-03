"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useApi } from "@/lib/api";
import type { Colecao } from "@/lib/tipos";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { MascoteBoasVindas } from "@/components/MascoteBoasVindas";

type Tarefa = { id: string; titulo: string; texto: string; icone: string; href: string; feita: boolean };
type GarimpoResumo = { id: string; termos: string[]; fontes: string[] };
const TAREFAS_POR_PAGINA = 3;

/** Primeiros passos: cada tarefa se marca sozinha pelo que a pessoa já fez na conta. */
export default function Inicio() {
  const [paginaEscolhida, setPaginaEscolhida] = useState<number | null>(null);
  const [direcao, setDirecao] = useState(1);
  const paginaRef = useRef<HTMLDivElement>(null);
  const animacoes = useRef<Animation[]>([]);
  const transicao = useRef(0);
  const { eu, pronto } = useApp();
  const { dados: garimpos } = useApi<GarimpoResumo[]>(eu ? "/api/garimpos?limite=50" : null);
  const { dados: colecoes } = useApi<Colecao[]>(eu ? "/api/colecoes" : null);

  const lista = garimpos ?? [];
  const salvos = (colecoes ?? []).reduce((soma, c) => soma + c.itens, 0);
  const grupos: { nome: string; tarefas: Tarefa[] }[] = [
    { nome: "Começar", tarefas: [
      { id: "conta", titulo: "Criar sua conta", texto: "Para guardar suas buscas e ideias", icone: "usuario",
        href: "/entrar?modo=criar&proximo=%2Finicio", feita: !!eu },
      { id: "quiz", titulo: "Contar o que você procura", texto: "A Cleo acerta mais quando conhece seus nichos", icone: "alvo",
        href: "/boas-vindas?proximo=%2Finicio", feita: !!eu?.espaco.boas_vindas_ok },
      { id: "saas", titulo: "Contar qual é o seu SaaS", texto: "Nome e o que ele faz, para ideias perto do seu negócio", icone: "maleta",
        href: "/config#negocio", feita: !!eu?.meu_saas?.nome },
    ] },
    { nome: "Explorar a Cleo", tarefas: [
      { id: "garimpo", titulo: "Fazer seu primeiro garimpo", texto: "Busque um nicho no TikTok e no Instagram", icone: "radar",
        href: "/pesquisa", feita: lista.length > 0 || (eu?.uso.garimpos ?? 0) > 0 },
      { id: "palavras", titulo: "Garimpar 3 palavras de uma vez", texto: "Separe por vírgula, como “app para médicos, clínica, consultório”", icone: "busca",
        href: "/pesquisa", feita: lista.some((g) => g.termos.length >= 3) },
      { id: "fontes", titulo: "Buscar no TikTok e no Instagram juntos", texto: "Escolha “Todas” nas fontes da Pesquisa", icone: "globo",
        href: "/pesquisa", feita: lista.some((g) => g.fontes.includes("tiktok") && g.fontes.includes("instagram")) },
      { id: "salvar", titulo: "Separar 3 vídeos para análise", texto: "Salve os vídeos que quer estudar com calma", icone: "salvo",
        href: lista[0] ? `/garimpo/${lista[0].id}` : "/ideias", feita: salvos >= 3 },
      { id: "colecoes", titulo: "Organizar em 2 coleções", texto: "Uma por nicho ou por tipo de vídeo", icone: "pacote",
        href: "/salvos", feita: (colecoes?.length ?? 0) >= 2 },
    ] },
  ];
  const tarefas = grupos.flatMap((g) => g.tarefas);
  const feitas = tarefas.filter((t) => t.feita).length;
  const proxima = tarefas.find((t) => !t.feita);
  const totalPaginas = Math.ceil(tarefas.length / TAREFAS_POR_PAGINA);
  const paginaInicial = Math.floor(Math.max(0, tarefas.findIndex((t) => !t.feita)) / TAREFAS_POR_PAGINA);
  const pagina = paginaEscolhida ?? paginaInicial;
  const inicio = pagina * TAREFAS_POR_PAGINA;
  const tarefasVisiveis = tarefas.slice(inicio, inicio + TAREFAS_POR_PAGINA);
  const primeiroNome = eu?.conta.nome && !eu.conta.nome.includes("@") ? eu.conta.nome.trim().split(/\s+/)[0] : null;

  useEffect(() => () => {
    transicao.current++;
    animacoes.current.forEach((animacao) => animacao.cancel());
  }, []);

  async function mudarPagina(destino: number) {
    if (destino < 0 || destino >= totalPaginas) return;
    const vez = ++transicao.current;
    animacoes.current.forEach((animacao) => animacao.cancel());
    if (destino === pagina) return;
    const sentido = destino > pagina ? 1 : -1;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const linhas = paginaRef.current?.querySelectorAll(".boas-grupo h2, .boas-tarefa") ?? [];
      animacoes.current = Array.from(linhas, (linha, indice) => linha.animate([
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${-sentido * 14}px)` },
      ], { duration: 110, delay: indice * 12, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }));
      await Promise.all(animacoes.current.map((animacao) => animacao.finished.catch(() => {})));
    }
    if (vez !== transicao.current) return;
    setDirecao(sentido);
    setPaginaEscolhida(destino);
  }

  return (
    <div className="boas">
      <div className="boas-fundo" aria-hidden="true" />

      <div className="boas-topo">
        <MascoteBoasVindas />
        <h1>{primeiroNome ? `Boas-vindas, ${primeiroNome}!` : "Boas-vindas à Cleo!"}</h1>
        <p>Vamos deixar tudo pronto para você achar sua próxima ideia em poucos passos.</p>
      </div>

      <div className="boas-cartao">
        <div className="boas-cartao-topo">
          <span>Seus primeiros passos</span>
          <span className="boas-contagem">{pronto ? `${feitas} de ${tarefas.length}` : ""}</span>
          <span className="boas-barra" role="progressbar" aria-label="Tarefas feitas" aria-valuemin={0} aria-valuemax={tarefas.length} aria-valuenow={feitas}>
            <i style={{ width: `${(feitas / tarefas.length) * 100}%` }} />
          </span>
        </div>
        <div id="boas-tarefas" className="boas-pagina" aria-live="polite" aria-atomic="true" ref={paginaRef}>
        <div key={pagina} className="boas-folha" style={{ "--sentido": direcao } as CSSProperties}>
        <span className="oculto">Página {pagina + 1} de {totalPaginas}. Tarefas {inicio + 1} a {inicio + tarefasVisiveis.length}.</span>
        {grupos.map((g) => ({ ...g, visiveis: g.tarefas.filter((t) => tarefasVisiveis.includes(t)) })).filter((g) => g.visiveis.length > 0).map((g) => (
          <section key={g.nome} className="boas-grupo" aria-label={g.nome}>
            <h2>{g.nome}<span>{g.tarefas.filter((t) => t.feita).length}/{g.tarefas.length}</span></h2>
            <ol className="boas-lista">
              {g.visiveis.map((t) => {
                const principal = pronto && t.id === proxima?.id;
                return (
                  <li key={t.id} data-tarefa={t.id} style={{ "--linha": tarefasVisiveis.indexOf(t) } as CSSProperties} className={`boas-tarefa${t.feita ? " feita" : ""}${principal ? " atual" : ""}`}>
                    <span className="boas-tarefa-icone" aria-hidden="true"><Icone nome={t.feita ? "check" : t.icone} tamanho={14} traco={1.8} /></span>
                    <span className="boas-tarefa-texto">
                      <b>{t.titulo}</b>
                      <span>{t.texto}</span>
                    </span>
                    {t.feita ? (
                      <span className="boas-feito"><Icone nome="check" tamanho={11} traco={2.4} /> Feito</span>
                    ) : (
                      <Link href={t.href} className={`boas-bt${principal ? " principal" : ""}`}>
                        {principal ? "Começar" : "Fazer"}{principal && <Icone nome="direita" tamanho={12} traco={2.2} />}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        </div>
        </div>
        <nav className="boas-paginacao" aria-label="Páginas das tarefas">
          <button type="button" className="boas-bt" disabled={pagina === 0} onClick={() => mudarPagina(pagina - 1)} aria-controls="boas-tarefas" aria-label="Página anterior">
            <Icone nome="voltar" tamanho={13} /><span>Anterior</span>
          </button>
          <div className="boas-paginas" style={{ "--pagina": pagina } as CSSProperties}>
            {Array.from({ length: totalPaginas }, (_, indice) => (
              <button key={indice} type="button" className="boas-bt" aria-label={`Página ${indice + 1}`} aria-current={pagina === indice ? "page" : undefined} aria-controls="boas-tarefas" onClick={() => mudarPagina(indice)}>
                {indice + 1}
              </button>
            ))}
          </div>
          <button type="button" className="boas-bt" disabled={pagina === totalPaginas - 1} onClick={() => mudarPagina(pagina + 1)} aria-controls="boas-tarefas" aria-label="Próxima página">
            <span>Próxima</span><Icone nome="direita" tamanho={13} />
          </button>
        </nav>
      </div>

      {pronto && !proxima && (
        <div className="boas-pronto">
          <span>Tudo pronto. Agora é com você.</span>
          <Link href="/pesquisa" className="boas-bt principal">Ir para a Pesquisa</Link>
        </div>
      )}
    </div>
  );
}
