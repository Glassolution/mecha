"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { MODELO, num } from "@/lib/fmt";
import type { Ideia } from "@/lib/tipos";
import { AvisoExemplo, Grafico, ListaVeredito, SetaTendencia, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { SalvarEm } from "@/components/SalvarEm";

export default function FichaDaIdeia() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { avisar } = useApp();
  const { dados: i, erro } = useApi<Ideia>(`/api/ideias/${id}`);
  const [salvando, setSalvando] = useState(false);

  if (erro) return <Vazio titulo="Ideia não encontrada." acao={<Link className="bt1" href="/ideias">Ver ideias</Link>} />;
  if (!i) return <div className="esqueleto" style={{ height: 500 }} />;

  async function copiarResumo() {
    const t = `${i!.titulo_pt}${i!.exemplo ? " (EXEMPLO)" : ""}\n${i!.problema}\nPara: ${i!.publico}\nAtenção: ${num(i!.views_total)} views · ${i!.videos} vídeos · ${i!.autores} criadores`;
    await navigator.clipboard.writeText(t);
    avisar("Resumo copiado");
  }

  const medindo = i.crescimento === null || i.videos < 3 || !i.historia_7d;

  return (
    <>
      <button className="bt3" onClick={() => (window.history.length > 1 ? router.back() : router.push("/ideias"))} style={{ marginBottom: 16 }}>
        <Icone nome="voltar" /> Voltar
      </button>
      {i.exemplo && <AvisoExemplo>Esta ideia é de exemplo, com números inventados para mostrar a tela.</AvisoExemplo>}
      <div className="chips" style={{ marginBottom: 14 }}>
        <span className="selo">{i.nicho_rotulo}</span>
        <span className="selo">{MODELO[i.modelo] ?? i.modelo}</span>
        <span className="nota">{i.nota}</span>
      </div>
      <h1 className="titulo-pagina" style={{ maxWidth: 900 }}>{i.titulo_pt}</h1>
      <p className="sub-pagina">{i.problema}</p>
      <p className="fraco" style={{ marginTop: 6 }}>Para: {i.publico}</p>

      <div className="acoes">
        <button className="bt1" disabled title="Chega com o Estúdio"><Icone nome="estudio" /> Gerar o plano da ideia</button>
        <button className="bt2" onClick={() => setSalvando(true)}><Icone nome="salvo" /> Salvar em…</button>
        <button className="bt2" onClick={copiarResumo}><Icone nome="copiar" /> Copiar resumo</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <section className="painel">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>Por que está em alta</h2>
          {i.veredito && <ListaVeredito itens={i.veredito.itens} />}
        </section>
        <section className="painel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 style={{ fontSize: 19 }}>Views por dia, 30 dias</h2>
            <SetaTendencia c={i.crescimento} medindo={medindo} />
          </div>
          {i.serie_30d && <Grafico serie={i.serie_30d} />}
          <p className="fraco" style={{ fontSize: 13, marginTop: 8 }}>{i.videos} vídeos · {i.autores} criadores · {num(i.views_total)} views</p>
        </section>
      </div>

      <section className="painel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 19, marginBottom: 8 }}>Os SaaS desta ideia</h2>
        <p className="suave">Chegam com o leitor de SaaS: nome, link, modelo, preço visto e se já tem versão no Brasil.</p>
      </section>
      <section className="painel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 19, marginBottom: 8 }}>Os vídeos</h2>
        <p className="suave">Os vídeos de cada ideia, com o trecho em que o SaaS é citado, aparecem aqui quando as ideias forem reais.</p>
      </section>
      {salvando && <SalvarEm tipo="ideia" id={i.id} fechar={() => setSalvando(false)} />}
    </>
  );
}
