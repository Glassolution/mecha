import { Pose } from "./Pose";

export function CartaoResultadoEsqueleto() {
  return <div className="res-cartao espera" aria-hidden="true">
    <span className="res-thumb esqueleto" />
    <div className="res-esqueleto-texto"><span className="esqueleto" /><span className="esqueleto" /><span className="esqueleto" /></div>
  </div>;
}

export function GradeResultadosEsqueleto({ quantidade = 8 }: { quantidade?: number }) {
  return <div className="res-grade" aria-label="Carregando vídeos" aria-busy="true">
    {Array.from({ length: quantidade }, (_, i) => <CartaoResultadoEsqueleto key={i} />)}
  </div>;
}

/** Visível desde a navegação, antes mesmo do primeiro evento da pesquisa. */
export function CarregandoResultados() {
  return <section className="res-carregando">
    <div className="res-carregando-topo" aria-hidden="true"><span className="esqueleto" /><span className="esqueleto" /></div>
    <div className="res-carregando-titulo"><div className="res-carregando-identidade"><Pose nome="pesquisando" largura={48} /><h1>Resultados da pesquisa</h1></div><span role="status"><i className="girando" aria-hidden="true" />Carregando vídeos…</span></div>
    <GradeResultadosEsqueleto />
  </section>;
}

