"use client";

import Image from "next/image";
import { useState } from "react";
import { Icone } from "@/components/Icone";
import s from "./landing.module.css";

const EXEMPLOS = [
  {nome:"Clínicas",termo:"app para clínicas",problema:"Agendar, confirmar, remarcar. Tudo passa pelo WhatsApp.",ideia:"Uma agenda que cuida do atendimento.",criativo:"Sua agenda está cheia. Sua sala de espera também?"},
  {nome:"Educação",termo:"ia para estudar",problema:"Aulas, anotações e provas. Organizar o estudo virou outro trabalho.",ideia:"Um plano de estudos que acompanha o aluno.",criativo:"Você estuda por horas. Mas lembra do que aprendeu?"},
  {nome:"Finanças",termo:"app para controlar gastos",problema:"Os gastos estão em vários lugares. A visão do mês, em lugar nenhum.",ideia:"Todas as despesas. Uma visão mais clara.",criativo:"O mês nem acabou. Seu dinheiro já?"},
];
export function PreviaProduto() {
  const [nicho, setNicho] = useState(0);
  const [modo, setModo] = useState<"ideia" | "criativo">("ideia");
  const exemplo = EXEMPLOS[nicho];
  return <div className={s.heroVisual} aria-label="Demonstração ilustrativa da Cleo">
    <div className={s.luzHero} aria-hidden="true" />
    <div className={s.promptFlutuante}><span><Image src="/marca/poses/logo.png" width={30} height={30} alt="" /></span><p>Encontre {modo === 'ideia' ? 'uma oportunidade de SaaS' : 'uma referência de anúncio'} no nicho de <b>{exemplo.nome.toLocaleLowerCase('pt-BR')}.</b></p></div>
    <div className={s.demoJanela}>
      <div className={s.demoMarca}><Image src="/marca/poses/logo.png" width={31} height={31} alt="" /><b>Cleo</b><span>Seu espaço para descobrir</span></div>
      <div className={s.demoConteudo}>
        <div className={s.demoAbas} role="group" aria-label="Objetivo da demonstração"><button aria-pressed={modo === 'ideia'} onClick={() => setModo('ideia')}><Icone nome="ideia" tamanho={14} />Ideias de SaaS</button><button aria-pressed={modo === 'criativo'} onClick={() => setModo('criativo')}><Icone nome="claquete" tamanho={14} />Criativos</button></div>
        <div className={s.demoBusca}><Icone nome="busca" tamanho={16} /><span>{exemplo.termo}</span><Icone nome="direita" tamanho={16} /></div>
        <div className={s.demoNichos} role="group" aria-label="Nicho da demonstração">{EXEMPLOS.map((e,i) => <button key={e.nome} aria-pressed={nicho === i} onClick={() => setNicho(i)}>{e.nome}</button>)}</div>
        <div className={s.demoResposta} key={`${modo}-${nicho}`} aria-live="polite" aria-atomic="true"><div><Icone nome={modo === 'ideia' ? 'alvo' : 'play'} tamanho={17} /><span>{modo === 'ideia' ? 'Um problema para explorar' : 'Uma abertura para se inspirar'}</span></div><h3>{modo === 'ideia' ? exemplo.ideia : exemplo.criativo}</h3><p>{exemplo.problema}</p><footer><span><Icone nome="tiktok" tamanho={12} />TikTok</span><span><Icone nome="instagram" tamanho={12} />Instagram</span><Icone nome="diagonal" tamanho={14} /></footer></div>
      </div>
    </div>
    <span className={s.demoNota}>Prévia interativa · Escolha um nicho</span>
  </div>;
}
