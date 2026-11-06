"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import type { Colecao, Garimpo } from "@/lib/tipos";
import { num } from "@/lib/fmt";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import styles from "./inicio.module.css";

import { RadarInicio, type DadosRadar } from "./RadarInicio";

export default function Inicio() {
  const { eu, pronto, recarregarEu } = useApp();
  useEffect(() => { void recarregarEu(); }, [recarregarEu]);
  const [dias, setDias] = useState<7 | 30>(7);
  const { dados: garimpos, erro: erroGarimpos, carregando: carregandoGarimpos } = useApi<Garimpo[]>(eu ? "/api/garimpos?limite=3" : null, { atualizarAoInvalidar: true });
  const { dados: colecoes } = useApi<Colecao[]>(eu ? "/api/colecoes" : null, { atualizarAoInvalidar: true });
  const { dados: painel, erro, carregando, recarregar } = useApi<DadosRadar>(eu ? `/api/publico/painel?dias=${dias}` : null);
  const nome = eu?.conta.nome && !eu.conta.nome.includes("@") ? eu.conta.nome.trim().split(/\s+/)[0] : null;
  const uso = eu?.uso.garimpos ?? 0;
  const limite = eu?.plano.garimpos ?? 0;
  const proporcao = limite > 0 ? Math.min(uso / limite, 1) : 0;
  const salvos = colecoes?.reduce((total, colecao) => total + colecao.itens, 0);
  const passos = [
    { titulo: "Personalize seu perfil", texto: "Conte à Cleo o que você procura.", href: "/boas-vindas?proximo=%2Finicio", feita: !!eu?.espaco.boas_vindas_ok, icone: "usuario" },
    { titulo: "Faça uma pesquisa", texto: "Encontre sua próxima oportunidade.", href: "/pesquisa", feita: uso > 0 || !!garimpos?.length, icone: "busca" },
    { titulo: "Guarde uma inspiração", texto: "Salve um vídeo para explorar depois.", href: "/salvos", feita: (salvos ?? 0) > 0, icone: "salvo" },
  ];
  const concluidos = passos.filter((p) => p.feita).length;
  const esperando = carregando || !pronto;

  return (
    <div className={styles.painel}>
      <div className={styles.breadcrumb}><Icone nome="inicio" tamanho={15} /><span>Meu workspace</span><span>/</span><b>Visão geral</b></div>
      <header className={styles.cabecalho}>
        <div><div className={styles.saudacao}>Seu ponto de partida</div><h1>{nome ? `Bom te ver, ${nome}.` : "Seu próximo insight começa aqui."}</h1><p>Acompanhe suas pesquisas e descubra o que está chamando atenção.</p></div>
        <Link className={styles.primario} href="/pesquisa"><Icone nome="mais" tamanho={16} /> Nova pesquisa</Link>
      </header>

      <section className={styles.metricas} aria-label="Resumo da sua conta">
        <article className={`${styles.cartao} ${styles.uso}`}>
          <div className={styles.usoCorpo}>
          <div className={styles.rotulo}><span><Icone nome="grafico" tamanho={18} /> Uso do seu plano</span><span className={styles.selo}>{eu?.plano.nome ?? "Seu plano"}</span></div>
          <div className={styles.usoPercentual}>{eu ? `${Math.round(proporcao * 100)}%` : "—"}<span> das pesquisas</span></div>
          <div className={styles.segmentos} role="progressbar" aria-label="Pesquisas usadas no mês" aria-valuemin={0} aria-valuemax={limite || 1} aria-valuenow={uso} aria-valuetext={`${uso} de ${limite} pesquisas usadas`}>
            {Array.from({ length: 44 }, (_, i) => <i key={i} className={i < Math.ceil(proporcao * 44) ? styles.preenchido : undefined} />)}
          </div>
          <p className={styles.usoDetalhe}>{eu ? `${uso} de ${limite} pesquisas utilizadas` : "Seu consumo aparece aqui"}</p>
          <div className={styles.usoAnalises} title="Análises de vídeos e de oportunidades concluídas neste mês. Reabrir uma análise não conta novamente."><span>Análises realizadas</span><b>{eu?.uso.analises == null ? "—" : num(eu.uso.analises)}</b></div>
          </div>
          <div className={styles.usoRodape}><span>{eu ? `${Math.max(0, limite - uso)} pesquisas disponíveis neste mês` : "Acompanhe seu uso mensal"}</span><Link href="/config#plano">Ver plano <Icone nome="diagonal" tamanho={13} /></Link></div>
        </article>
        <article className={styles.cartao}>
          <div className={styles.rotulo}><span><Icone nome="salvo" tamanho={17} /> Inspirações salvas</span></div>
          <div className={styles.numero}>{salvos === undefined ? "—" : num(salvos)}<span> itens</span></div>
          <p className={styles.legendaMetrica}>Boas referências para suas próximas ideias.</p>
          <div className={styles.rodapeMetrica}><span>Sua biblioteca pessoal</span><Link href="/salvos">Abrir salvos <Icone nome="diagonal" tamanho={13} /></Link></div>
        </article>
        <article className={styles.cartao}>
          <div className={styles.rotulo}><span><Icone nome="pacote" tamanho={17} /> Suas coleções</span></div>
          <div className={styles.numero}>{colecoes ? num(colecoes.length) : "—"}<span> coleções</span></div>
          <p className={styles.legendaMetrica}>Cada descoberta no seu lugar.</p>
          <div className={styles.rodapeMetrica}><span>Organize por nicho ou projeto</span><Link href="/salvos">Organizar <Icone nome="diagonal" tamanho={13} /></Link></div>
        </article>
      </section>

      <div className={styles.divisor} />
      <RadarInicio dados={painel} dias={dias} mudarDias={setDias} carregando={esperando} erro={!!erro} recarregar={() => void recarregar()} garimpos={garimpos} carregandoGarimpos={carregandoGarimpos || !pronto} erroGarimpos={!!erroGarimpos} />

      {concluidos < passos.length && <section className={styles.primeiros}><div className={styles.primeirosTopo}><span><Icone nome="bussola" tamanho={17} /><h2>Deixe a Cleo com a sua cara</h2></span><span>{concluidos} de {passos.length} passos</span></div><div className={styles.passos}>{passos.map((p, i) => <Link href={p.href} key={p.titulo} className={p.feita ? styles.feito : undefined}><span className={styles.passoNumero}>{p.feita ? <Icone nome="check" tamanho={14} /> : `0${i + 1}`}</span><span><b>{p.titulo}</b><small>{p.texto}</small></span><Icone nome={p.feita ? "check" : "diagonal"} tamanho={15} /></Link>)}</div></section>}
    </div>
  );
}
