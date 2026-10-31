"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Fase = "pesquisando" | "revelando" | "resultados";
type Props = {
  revelar: boolean;
  iniciarNoCentro?: boolean;
  cabecalho: ReactNode;
  atividade: (compacta: boolean) => ReactNode;
  children: ReactNode;
  aviso?: ReactNode;
};

/** A mesma barra sai do centro e encontra sua posição na grade quando chegam os dados. */
export function PalcoPesquisa({ revelar, iniciarNoCentro = false, cabecalho, atividade, children, aviso }: Props) {
  const [fase, setFase] = useState<Fase>(() => revelar && !iniciarNoCentro ? "resultados" : "pesquisando");
  const [entrada, setEntrada] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const animacoes = useRef<Animation[]>([]);
  const origem = useRef<DOMRect | null>(null);
  const iniciou = useRef(false);

  useLayoutEffect(() => {
    if (!revelar || fase !== "pesquisando" || iniciou.current) return;
    iniciou.current = true;
    let cancelada = false;
    const el = raiz.current;
    const barra = el?.querySelector<HTMLElement>(".res-busca");
    const painel = el?.querySelector<HTMLElement>(".pesquisa-atividade");
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saida = !reduzir && painel ? painel.animate([
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-6px)" },
    ], { duration: 160, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }) : null;
    if (saida) animacoes.current.push(saida);
    (saida?.finished ?? Promise.resolve()).then(() => {
      if (cancelada) return;
      origem.current = barra?.getBoundingClientRect() ?? null;
      setEntrada(!reduzir);
      setFase(reduzir ? "resultados" : "revelando");
    }).catch(() => {});
    return () => { cancelada = true; iniciou.current = false; };
  }, [revelar, fase]);

  useLayoutEffect(() => {
    if (fase !== "revelando") return;
    const barra = raiz.current?.querySelector<HTMLElement>(".res-busca");
    const painel = raiz.current?.querySelector<HTMLElement>(".pesquisa-atividade");
    animacoes.current.forEach((animacao) => animacao.cancel());
    animacoes.current = [];
    const antes = origem.current;
    if (!barra || !antes) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const depois = barra.getBoundingClientRect();
    barra.style.transformOrigin = "0 0";
    const movimento = barra.animate([
      { transform: `translate(${antes.left - depois.left}px, ${antes.top - depois.top}px) scale(${antes.width / depois.width}, ${antes.height / depois.height})` },
      { transform: "translate(0, 0) scale(1, 1)" },
    ], { duration: 820, easing: "cubic-bezier(.22,1,.36,1)" });
    const resumo = painel?.animate([
      { opacity: 0, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 420, delay: 270, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    animacoes.current.push(movimento, ...(resumo ? [resumo] : []));
    const entradas = Array.from(raiz.current?.querySelectorAll(".pesquisa-resultados .res-cartao") ?? [])
      .flatMap((cartao) => cartao.getAnimations());
    let cancelada = false;
    Promise.all([movimento, ...entradas].map((animacao) => animacao.finished.catch(() => {}))).then(() => {
      if (cancelada) return;
      setEntrada(false);
      setFase("resultados");
    });
    return () => {
      cancelada = true;
      animacoes.current.forEach((animacao) => animacao.cancel());
      barra.style.removeProperty("transform-origin");
    };
  }, [fase]);

  useLayoutEffect(() => () => animacoes.current.forEach((animacao) => animacao.cancel()), []);

  return <div className={`pesquisa-fluxo pesquisa-${fase}`} ref={raiz} data-fase={fase} data-entrada={entrada ? "" : undefined}>
    <div className="pesquisa-palco">
      <div className="pesquisa-cabecalho">{cabecalho}</div>
      <div className="pesquisa-atividade">{atividade(fase !== "pesquisando")}</div>
      {aviso}
    </div>
    <div className="pesquisa-resultados" hidden={fase === "pesquisando"}>{fase !== "pesquisando" ? children : null}</div>
  </div>;
}
