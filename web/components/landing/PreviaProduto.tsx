"use client";

import Image from "next/image";
import { useState } from "react";
import { Icone } from "@/components/Icone";
import s from "./landing.module.css";

const EXEMPLOS = [
  {nome:"Clínicas",termo:"app para clínicas",
    video:{perfil:"@dra.camila",legenda:"Passei 2h no WhatsApp remarcando paciente 😩",views:"184 mil",cor:"#cfe6e1"},
    ideia:"Uma agenda que confirma e remarca sozinha.",criativo:"Sua agenda está cheia. Sua sala de espera também?",
    passos:["Agenda online com link próprio","Confirmação automática no WhatsApp","Lista de espera para encaixes"]},
  {nome:"Educação",termo:"ia para estudar",
    video:{perfil:"@estudacomlu",legenda:"Estudei 6h e não lembro de nada. Alguém mais?",views:"312 mil",cor:"#dcd6f2"},
    ideia:"Um plano de estudos que revisa com o aluno.",criativo:"Você estuda por horas. Mas lembra do que aprendeu?",
    passos:["Resumo automático das aulas","Revisões no tempo certo","Simulados com o conteúdo do aluno"]},
  {nome:"Finanças",termo:"app para controlar gastos",
    video:{perfil:"@contasdabia",legenda:"Fui ver o extrato e chorei. 4 cartões, zero controle",views:"97 mil",cor:"#d9ead2"},
    ideia:"Todos os cartões em uma visão do mês.",criativo:"O mês nem acabou. Seu dinheiro já?",
    passos:["Junta os gastos de todos os cartões","Alerta antes de estourar o mês","Resumo semanal no celular"]},
];
const PASSOS_CRIATIVO = ["Gancho com a dor nos 3 primeiros segundos","Mostre o antes e o depois","Feche com uma chamada simples"];
export function PreviaProduto() {
  const [nicho, setNicho] = useState(0);
  const [modo, setModo] = useState<"ideia" | "criativo">("ideia");
  const exemplo = EXEMPLOS[nicho];
  return <div className={s.heroVisual} aria-label="Demonstração ilustrativa da Cleo">
    <div className={s.luzHero} aria-hidden="true" />
    <div className={s.promptFlutuante}><span><Image src="/marca/cleo-icone.png" width={30} height={30} alt="" /></span><p>Encontre {modo === 'ideia' ? 'uma oportunidade de SaaS' : 'uma referência de anúncio'} no nicho de <b>{exemplo.nome.toLocaleLowerCase('pt-BR')}.</b></p></div>
    <div className={s.demoJanela}>
      <div className={s.demoMarca}><Image src="/marca/cleo-icone.png" width={31} height={31} alt="" /><b>Cleo</b><span>Seu espaço para descobrir</span></div>
      <div className={s.demoConteudo}>
        <div className={s.demoAbas} role="group" aria-label="Objetivo da demonstração"><button aria-pressed={modo === 'ideia'} onClick={() => setModo('ideia')}><Icone nome="ideia" tamanho={14} />Ideias de SaaS</button><button aria-pressed={modo === 'criativo'} onClick={() => setModo('criativo')}><Icone nome="claquete" tamanho={14} />Criativos</button></div>
        <div className={s.demoBusca}><Icone nome="busca" tamanho={16} /><span>{exemplo.termo}</span><Icone nome="direita" tamanho={16} /></div>
        <div className={s.demoNichos} role="group" aria-label="Nicho da demonstração">{EXEMPLOS.map((e,i) => <button key={e.nome} aria-pressed={nicho === i} onClick={() => setNicho(i)}>{e.nome}</button>)}</div>
        <div className={s.demoResposta} key={`${modo}-${nicho}`} aria-live="polite" aria-atomic="true">
          <div className={s.demoVideo} style={{background:`linear-gradient(170deg,${exemplo.video.cor},#2b2b2b 120%)`}} aria-label={`Vídeo do TikTok de ${exemplo.video.perfil}`}>
            <span className={s.demoVideoTopo}><Icone nome="tiktok" tamanho={10} />TikTok</span>
            <span className={s.demoVideoPlay}><Icone nome="play" tamanho={13} /></span>
            <div className={s.demoVideoInfo}><b>{exemplo.video.perfil}</b><p>{exemplo.video.legenda}</p><span><Icone nome="coracao" tamanho={9} />{exemplo.video.views}</span></div>
          </div>
          <Icone nome="direita" tamanho={14} className={s.demoSeta} />
          <div className={s.demoAnalise}>
            <div className={s.demoAnaliseRotulo}><Image src="/marca/cleo-icone.png" width={16} height={16} alt="" /><span>{modo === 'ideia' ? 'A Cleo encontrou neste vídeo' : 'A Cleo viu neste vídeo'}</span></div>
            <h3>{modo === 'ideia' ? exemplo.ideia : exemplo.criativo}</h3>
            <span className={s.demoComo}>{modo === 'ideia' ? 'Como criar o SaaS' : 'Como montar o criativo'}</span>
            <ol>{(modo === 'ideia' ? exemplo.passos : PASSOS_CRIATIVO).map((p, i) => <li key={p}><i>{i + 1}</i>{p}</li>)}</ol>
          </div>
        </div>
      </div>
    </div>
    <span className={s.demoNota}>Prévia interativa · Escolha um nicho</span>
  </div>;
}
