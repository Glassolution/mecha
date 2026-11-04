"use client";

import Image from "next/image";
import { useState } from "react";
import { Icone } from "@/components/Icone";
import s from "./landing.module.css";

const EXEMPLOS = [
  { nome: "Clínicas", termo: "app para clínicas", ideia: "Menos faltas. Mais tempo para atender.", sinal: "Agendar, confirmar, remarcar. Tudo ainda passa pelo WhatsApp.", criativo: "Sua agenda está cheia. Mas a sala de espera está vazia?", categoria: "Agenda e atendimento" },
  { nome: "Educação", termo: "ia para estudar", ideia: "Uma rotina de estudos que acompanha o aluno.", sinal: "Entre aulas, anotações e provas, organizar o estudo vira outro trabalho.", criativo: "Você estuda por horas. Mas lembra do que aprendeu?", categoria: "Aprendizado e organização" },
  { nome: "Finanças", termo: "app para controlar gastos", ideia: "Um jeito simples de entender para onde o dinheiro vai.", sinal: "Os gastos estão em vários lugares. A visão do mês, em lugar nenhum.", criativo: "O mês nem acabou. Seu dinheiro já?", categoria: "Finanças pessoais" },
];

export function PreviaProduto() {
  const [modo, setModo] = useState<"ideia" | "criativo">("ideia");
  const [indice, setIndice] = useState(0);
  const exemplo = EXEMPLOS[indice];
  return <div className={s.previa} aria-label="Demonstração ilustrativa da Cleo">
    <div className={s.previaTopo}><span className={s.miniMarca}><Image src="/marca/poses/logo.png" width={27} height={27} alt="" />Cleo</span><span>Uma ideia começa com uma busca.</span></div>
    <div className={s.previaAbas} role="group" aria-label="Objetivo da demonstração"><button aria-pressed={modo === "ideia"} onClick={() => setModo("ideia")}><Icone nome="ideia" tamanho={14} />Encontrar uma ideia</button><button aria-pressed={modo === "criativo"} onClick={() => setModo("criativo")}><Icone nome="claquete" tamanho={14} />Criar um anúncio</button></div>
    <div className={s.previaBusca}><Icone nome="busca" tamanho={17} /><span>{exemplo.termo}</span><span className={s.buscarSeta}><Icone nome="direita" tamanho={16} /></span></div>
    <div className={s.exemplos} role="group" aria-label="Nicho da demonstração">{EXEMPLOS.map((e, i) => <button key={e.nome} aria-pressed={i === indice} onClick={() => setIndice(i)}>{e.nome}</button>)}</div>
    <div className={s.previaResultado} aria-live="polite" aria-atomic="true" key={`${modo}-${indice}`}>
      <div className={s.sinal}><span><Icone nome={modo === "ideia" ? "analise" : "play"} tamanho={17} /></span><div><small>{modo === "ideia" ? "UM PROBLEMA PARA EXPLORAR" : "UM GANCHO PARA SE INSPIRAR"}</small><p>{modo === "ideia" ? exemplo.sinal : "Uma boa referência pode virar uma nova forma de contar sua história."}</p></div></div>
      <div className={s.resultadoIdeia}><span>{modo === "ideia" ? "Possível oportunidade" : "Possível abertura de vídeo"}</span><h3>{modo === "ideia" ? exemplo.ideia : exemplo.criativo}</h3><footer><span>{exemplo.categoria}</span><Icone nome="diagonal" tamanho={16} /></footer></div>
    </div>
    <p className={s.previaNota}>Prévia ilustrativa · Explore os nichos acima</p>
  </div>;
}
