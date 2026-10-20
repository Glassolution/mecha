"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icone } from "./Icone";

// Um observador para todos os elementos que aparecem ao rolar.
let observador: IntersectionObserver | null = null;
const avisos = new WeakMap<Element, () => void>();

function observar(el: Element, aoVer: () => void) {
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          avisos.get(e.target)?.();
          avisos.delete(e.target);
          observador!.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
  }
  avisos.set(el, aoVer);
  observador.observe(el);
  return () => {
    avisos.delete(el);
    observador?.unobserve(el);
  };
}

type RevelaProps<T extends React.ElementType> = { as?: T; i?: number } & Omit<React.ComponentPropsWithoutRef<T>, "as">;

/** Aparece com fade, subida e desfoque quando entra na tela. i = posição para o efeito em sequência. */
export function Revela<T extends React.ElementType = "div">({ as, i = 0, className, style, ...resto }: RevelaProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  const ref = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setVisivel(true), 0);
      return () => clearTimeout(t);
    }
    const r = ref.current.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      // já está na tela: aparece no próximo quadro, sem esperar o observador
      const t = setTimeout(() => setVisivel(true), 16);
      return () => clearTimeout(t);
    }
    return observar(ref.current, () => setVisivel(true));
  }, []);
  return (
    <Tag
      ref={ref}
      data-revelar=""
      className={[className, visivel ? "visivel" : ""].filter(Boolean).join(" ") || undefined}
      style={{ ...style, "--i": i } as React.CSSProperties}
      {...resto}
    />
  );
}

/** Título que aparece palavra por palavra. */
export function TituloAnimado({ texto, className }: { texto: string; className?: string }) {
  return (
    <h1 className={className} aria-label={texto}>
      {texto.split(" ").map((p, i) => (
        <span key={i} aria-hidden="true">
          <span className="palavra" style={{ "--i": i } as React.CSSProperties}>{p}</span>{" "}
        </span>
      ))}
    </h1>
  );
}

/** Abas em pílula com o fundo deslizando até a aba escolhida. */
export function AbasPilula<T extends string>({ opcoes, valor, mudar, rotulo }: { opcoes: [T, string][]; valor: T; mudar: (v: T) => void; rotulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = caixa.current?.querySelector<HTMLButtonElement>(`[data-v="${valor}"]`);
    if (el) setPos({ left: el.offsetLeft, width: el.offsetWidth });
  }, [valor]);
  return (
    <div className="abas-pilula" role="tablist" aria-label={rotulo} ref={caixa}>
      {pos && <span className="indicador" style={pos} aria-hidden="true" />}
      {opcoes.map(([v, r]) => (
        <button key={v} data-v={v} role="tab" aria-selected={valor === v} onClick={() => mudar(v)}>
          {r}
        </button>
      ))}
    </div>
  );
}

/** Menu suspenso de uma escolha, como o "Vibe" do Framer. */
export function Suspenso<T extends string>({ rotulo, opcoes, valor, mudar }: { rotulo: string; opcoes: [T, string][]; valor: T; mudar: (v: T) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  const atual = opcoes.find(([v]) => v === valor)?.[1] ?? rotulo;
  return (
    <div className="suspenso" ref={ref}>
      <button aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        {atual} <Icone nome="baixo" tamanho={15} />
      </button>
      {aberto && (
        <div className="menu" role="menu" aria-label={rotulo}>
          <div className="janela-grupo" style={{ padding: "6px 12px 4px" }}>{rotulo}</div>
          {opcoes.map(([v, r]) => (
            <button key={v} className="menu-item" role="menuitemradio" aria-checked={v === valor} onClick={() => { mudar(v); setAberto(false); }}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inclinação 3D suave seguindo o mouse, com brilho que acompanha o cursor. */
export function useInclinar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform = `rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg)`;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
      });
    };
    const sair = () => {
      cancelAnimationFrame(quadro);
      el.style.transform = "";
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", sair);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
    };
  }, []);
  return ref;
}

/** Número que sobe até o valor final. */
export function NumeroSobe({ valor }: { valor: number }) {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setMostrado(valor), 0);
      return () => clearTimeout(t);
    }
    const inicio = performance.now();
    let q = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 900);
      setMostrado(Math.round(valor * (1 - Math.pow(1 - t, 3))));
      if (t < 1) q = requestAnimationFrame(passo);
    };
    q = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(q);
  }, [valor]);
  return <>{mostrado.toLocaleString("pt-BR")}</>;
}
