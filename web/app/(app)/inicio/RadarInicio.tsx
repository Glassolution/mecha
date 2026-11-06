"use client";

import Image from "next/image";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import { capaUrl, PLATAFORMA, quando } from "@/lib/fmt";
import type { Garimpo, Video } from "@/lib/tipos";
import s from "./radar.module.css";

export type DadosRadar = {
  videos: (Video & { pesquisas: number })[];
  nichos: { id: string; nome: string; pesquisas: number }[];
};

type Props = {
  dados?: DadosRadar;
  dias: 7 | 30;
  mudarDias: (dias: 7 | 30) => void;
  carregando: boolean;
  erro: boolean;
  recarregar: () => void;
  garimpos?: Garimpo[];
  carregandoGarimpos: boolean;
  erroGarimpos: boolean;
};

function tituloVideo(video: Video) {
  return (video.gancho || video.texto).replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim() || "Conheça esta descoberta";
}

export function RadarInicio({ dados, dias, mudarDias, carregando, erro, recarregar, garimpos, carregandoGarimpos, erroGarimpos }: Props) {
  const videos = dados?.videos.slice(0, 4) ?? [];
  const nichos = dados?.nichos ?? [];

  return <section className={s.radar} aria-labelledby="radar-titulo">
    <header className={s.cabecalho}>
      <h2 id="radar-titulo">Para sua próxima ideia</h2>
      <select aria-label="Período dos destaques" value={dias} onChange={e => mudarDias(Number(e.target.value) as 7 | 30)}>
        <option value={7}>Esta semana</option><option value={30}>Este mês</option>
      </select>
    </header>

    {erro ? <div className={s.estado} role="alert"><p>Não foi possível carregar as descobertas.</p><button onClick={recarregar}>Tentar novamente <Icone nome="refazer" tamanho={13} /></button></div> : carregando ? <div className={s.videos} role="status" aria-label="Carregando descobertas">{[0, 1, 2, 3].map(n => <div key={n} className={s.esqueleto} />)}</div> : videos.length ? <div className={s.videos}>
      {videos.map(video => <Link className={s.video} key={video.id} href={`/video/${encodeURIComponent(video.id)}`}>
        <div className={s.capa}>
          {capaUrl(video.capa) ? <Image src={capaUrl(video.capa)!} alt="" fill sizes="(max-width:600px) 45vw, (max-width:1000px) 40vw, 260px" style={{objectFit:"cover"}} /> : <span className={s.semCapa}><Icone nome="claquete" tamanho={32} /></span>}
          <span className={s.play}><Icone nome="play" tamanho={21} /></span>
          <span className={s.fonte}>{PLATAFORMA[video.fonte] ?? video.fonte}</span>
        </div>
        <h3>{tituloVideo(video)}</h3>
      </Link>)}
    </div> : <div className={s.estado}><p>As próximas descobertas aparecem aqui.</p><Link href="/pesquisa">Explorar com a Cleo <Icone nome="direita" tamanho={13} /></Link></div>}

    {!erro && !carregando && nichos.length > 0 && <section className={s.nichos} aria-labelledby="nichos-titulo">
      <h3 id="nichos-titulo">Explore um nicho</h3>
      <div className={s.temas}>{nichos.map(n => <Link key={n.id} href={`/pesquisa?nicho=${encodeURIComponent(n.nome)}`}>{n.nome}<Icone nome="diagonal" tamanho={12} /></Link>)}</div>
    </section>}

    <section className={s.recentes} aria-labelledby="pesquisas-titulo">
      <header><h3 id="pesquisas-titulo">Continue de onde parou</h3><Link href="/garimpo">Ver todas <Icone nome="direita" tamanho={13} /></Link></header>
      {carregandoGarimpos ? <p className={s.mensagem} role="status">Carregando suas pesquisas…</p> : erroGarimpos ? <p className={s.mensagem}>Seu histórico está indisponível no momento.</p> : garimpos?.length ? <div className={s.lista}>{garimpos.slice(0, 3).map(g => <Link key={g.id} href={`/garimpo/${g.id}`}><Icone nome="busca" tamanho={15} /><span>{g.termos.join(", ")}</span><small>{quando(g.criado_em)}</small><Icone nome="direita" tamanho={14} /></Link>)}</div> : <div className={s.primeira}><p>Uma palavra pode ser o começo de uma boa ideia.</p><Link href="/pesquisa">Fazer uma pesquisa <Icone nome="direita" tamanho={13} /></Link></div>}
    </section>
  </section>;
}
