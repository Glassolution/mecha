"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import s from "./landing.module.css";

/** Progressive enhancement: conteúdo legível antes de carregar o JavaScript. */
export function Entrada({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animacao: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      animacao = el.animate([{ opacity:0, transform:"translateY(24px)" }, { opacity:1, transform:"translateY(0)" }], {duration:750,easing:"cubic-bezier(.22,1,.36,1)"});
      observer.disconnect();
    }, {threshold:.08});
    observer.observe(el);
    return () => { observer.disconnect(); animacao?.cancel(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

export function MenuMobile() {
  const [aberto, setAberto] = useState(false);
  return <div className={s.menuMobile}><button aria-label={aberto ? "Fechar navegação" : "Abrir navegação"} aria-expanded={aberto} aria-controls="landing-menu" onClick={() => setAberto(!aberto)}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d={aberto ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg></button>{aberto && <nav id="landing-menu" aria-label="Navegação móvel"><a href="#como-funciona" onClick={() => setAberto(false)}>Como funciona</a><a href="#recursos" onClick={() => setAberto(false)}>Recursos</a><a href="#duvidas" onClick={() => setAberto(false)}>Dúvidas</a><Link href="/entrar">Entrar na Cleo <Icone nome="diagonal" tamanho={14} /></Link></nav>}</div>;
}

const RECURSOS = [
  { titulo:"Pesquise com intenção", texto:"Escolha um nicho ou problema e encontre vídeos no TikTok e Instagram. Troque a rolagem sem fim por referências que fazem sentido para o que você quer criar.", icone:"busca" },
  { titulo:"Vá além da referência", texto:"Peça uma análise com IA para entender um vídeo ou explore oportunidades nos resultados da pesquisa. Investigue as dores do público e os caminhos possíveis para um SaaS.", icone:"analise" },
  { titulo:"Dê um lugar às boas ideias", texto:"Salve os vídeos que chamaram sua atenção em coleções por nicho, cliente ou projeto. Volte às referências quando chegar a hora de criar.", icone:"salvo" },
];
export function RecursosCleo() {
  const [ativo, setAtivo] = useState(0);
  return <div className={s.recursosLayout}>
    <div className={s.recursoVisual}>
      <div className={s.recursoJanela}><div className={s.janelaTopo}><span><i /><i /><i /></span><span>Cleo / {['Pesquisa','Análise','Coleções'][ativo]}</span><Icone nome="mais_h" tamanho={16} /></div>
        <div className={s.recursoCena} key={ativo} role="region" aria-label={`Prévia ilustrativa: ${RECURSOS[ativo].titulo}`}>
          {ativo === 0 ? <><div className={s.cenaBusca}><Icone nome="busca" tamanho={17} />apps para organizar a rotina<Icone nome="direita" tamanho={16} /></div><div className={s.cenaPlataformas}><span><Icone nome="tiktok" tamanho={13} />TikTok</span><span><Icone nome="instagram" tamanho={13} />Instagram</span></div><div className={s.referencias}>{['Organize o dia','Simplifique as tarefas','Encontre seu foco'].map((t,i) => <div key={t}><div><Icone nome={['relogio','check','alvo'][i]} tamanho={28} /><span><Icone nome="play" tamanho={12} /></span></div><p>{t}</p></div>)}</div></> : ativo === 1 ? <><div className={s.perguntaAnalise}>Que oportunidade existe nesse problema?</div><div className={s.respostaAnalise}><Image src="/marca/cleo-icone.png" width={35} height={35} alt="" /><div><b>Uma rotina mais simples para quem trabalha por conta própria.</b><p>Agendamento, tarefas e acompanhamento de clientes aparecem como pontos para explorar.</p><span><Icone nome="ideia" tamanho={13} />Possível direção para um SaaS</span></div></div><div className={s.linhasAnalise}><i /><i /><i /></div></> : <><div className={s.colecaoTitulo}><Icone nome="pacote" tamanho={22} /><h4>Meu próximo projeto</h4></div><div className={s.pastas}>{['Ideias de SaaS','Referências de anúncios','Para explorar depois'].map(t => <div key={t}><Icone nome="salvo" tamanho={19} /><span>{t}</span><Icone nome="diagonal" tamanho={14} /></div>)}</div><span className={s.salvoAviso}><Icone nome="check" tamanho={14} />Tudo no seu lugar.</span></>}
        </div><span className={s.exemploLabel}>Demonstração ilustrativa</span>
      </div>
    </div>
    <div className={s.acordeao}>{RECURSOS.map((r,i) => <div className={s.recursoItem} data-ativo={ativo === i} key={r.titulo}><h3><button id={`recurso-${i}`} aria-expanded={ativo === i} aria-controls={`recurso-conteudo-${i}`} onClick={() => setAtivo(i)}><span>{r.titulo}</span><Icone nome={ativo === i ? "baixo" : "direita"} tamanho={16} /></button></h3><div id={`recurso-conteudo-${i}`} role="region" aria-labelledby={`recurso-${i}`} className={s.recursoDescricao} inert={ativo !== i}><div><p>{r.texto}</p></div></div></div>)}</div>
  </div>;
}
