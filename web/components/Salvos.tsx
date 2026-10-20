"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import type { Colecao, Ideia, Video } from "@/lib/tipos";
import { CartaoIdeia, CartaoVideo, Vazio } from "./Cartoes";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";

type Detalhe = {
  id: string;
  nome: string;
  itens: ({ tipo: "video"; salvo_em: string; video: Video } | { tipo: "ideia"; salvo_em: string; ideia: Ideia })[];
};

export function Salvos({ colecaoId }: { colecaoId: string | null }) {
  const router = useRouter();
  const { avisar } = useApp();
  const { dados: colecoes, recarregar } = useApi<Colecao[]>("/api/colecoes");
  const [nova, setNova] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (!colecaoId && colecoes?.length) router.replace(`/salvos/${colecoes[0].id}`);
  }, [colecaoId, colecoes, router]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.trim()) return;
    const c = await api<Colecao>("/api/colecoes", { method: "POST", json: { nome: nova.trim() } });
    setNova("");
    setCriando(false);
    limparCache("/api/colecoes");
    await recarregar();
    router.push(`/salvos/${c.id}`);
  }

  return (
    <>
      <h1 className="titulo-pagina" style={{ marginBottom: 24 }}>Salvos</h1>
      <div className="salvos">
        <nav className="colecoes" aria-label="Coleções">
          {colecoes?.map((c) => (
            <Link key={c.id} href={`/salvos/${c.id}`} className="colecao-link" aria-current={String(c.id) === colecaoId ? "page" : undefined}>
              <span>{c.nome}</span>
              <span className="mono fraco" style={{ fontSize: 12 }}>{c.itens}</span>
            </Link>
          ))}
          {criando ? (
            <form onSubmit={criar} style={{ display: "grid", gap: 6, marginTop: 6 }}>
              <input className="campo" autoFocus value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da coleção" maxLength={60} aria-label="Nome da coleção" />
              <button className="bt1 bt-p" disabled={!nova.trim()}>Criar</button>
            </form>
          ) : (
            <button className="colecao-link" onClick={() => setCriando(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icone nome="mais" tamanho={16} /> Nova coleção</span>
            </button>
          )}
        </nav>
        <div>
          {colecoes && colecoes.length === 0 && (
            <Vazio
              titulo="Nada salvo ainda."
              texto="Salve vídeos e ideias para juntar referências por nicho ou por cliente."
              acao={<Link className="bt1" href="/garimpo">Fazer um garimpo</Link>}
            />
          )}
          {colecaoId && <DetalheColecao id={colecaoId} aoApagar={async () => { limparCache("/api/colecoes"); await recarregar(); router.replace("/salvos"); avisar("Coleção apagada"); }} />}
        </div>
      </div>
    </>
  );
}

function DetalheColecao({ id, aoApagar }: { id: string; aoApagar: () => void }) {
  const { avisar } = useApp();
  const { dados, erro, recarregar } = useApi<Detalhe>(`/api/colecoes/${id}`);

  if (erro) return <Vazio titulo="Coleção não encontrada." />;
  if (!dados) return <div className="esqueleto" style={{ height: 300 }} />;

  async function tirar(tipo: string, item: string) {
    await api(`/api/salvos/${id}/${tipo}/${encodeURIComponent(item)}`, { method: "DELETE" });
    limparCache("/api/colecoes");
    await recarregar();
    avisar("Tirado da coleção");
  }

  async function apagar() {
    if (!confirm(`Apagar a coleção “${dados!.nome}”? Os vídeos continuam na biblioteca.`)) return;
    await api(`/api/colecoes/${id}`, { method: "DELETE" });
    aoApagar();
  }

  async function copiarGanchos() {
    const linhas = dados!.itens
      .filter((i) => i.tipo === "video")
      .map((i, n) => {
        const v = (i as { video: Video }).video;
        return `${n + 1}. ${v.gancho ?? (v.texto || "").split("\n")[0]}\n   ${v.metrica} · ${v.url_original}`;
      });
    await navigator.clipboard.writeText(linhas.join("\n"));
    avisar(`${linhas.length} ganchos copiados`);
  }

  const videos = dados.itens.filter((i) => i.tipo === "video");
  const ideias = dados.itens.filter((i) => i.tipo === "ideia");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <h2 style={{ fontSize: 26, flex: 1 }}>{dados.nome}</h2>
        <button className="bt1" disabled title="Chega com o Estúdio"><Icone nome="estudio" /> Levar ao Estúdio</button>
        <a className="bt2" href={`/api/colecoes/${id}/planilha.csv`} download><Icone nome="planilha" /> Planilha</a>
        <button className="bt2" onClick={copiarGanchos} disabled={!videos.length}><Icone nome="copiar" /> Copiar ganchos</button>
        <button className="icone-bt" onClick={apagar} aria-label="Apagar coleção" title="Apagar coleção"><Icone nome="lixo" /></button>
      </div>
      {dados.itens.length === 0 && (
        <Vazio titulo="Esta coleção está vazia." texto="Use o botão Salvar nos vídeos e nas ideias." acao={<Link className="bt1" href="/ideias">Ver ideias</Link>} />
      )}
      {ideias.length > 0 && (
        <>
          <h3 style={{ fontSize: 18, margin: "4px 0 12px" }}>Ideias</h3>
          <div className="grade-ideias" style={{ marginBottom: 28 }}>
            {ideias.map((i) => {
              const ideia = (i as { ideia: Ideia }).ideia;
              return (
                <div key={ideia.id} style={{ position: "relative" }}>
                  <CartaoIdeia i={ideia} />
                  <button className="bt2 bt-p" style={{ position: "absolute", right: 14, bottom: 14 }} onClick={() => tirar("ideia", ideia.id)}>Tirar</button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {videos.length > 0 && (
        <>
          {ideias.length > 0 && <h3 style={{ fontSize: 18, margin: "4px 0 12px" }}>Vídeos</h3>}
          <div className="grade-videos">
            {videos.map((i) => {
              const v = (i as { video: Video }).video;
              return (
                <div key={v.id}>
                  <CartaoVideo v={v} />
                  <button className="bt3 bt-p" onClick={() => tirar("video", v.id)} style={{ marginTop: 4 }}>
                    <Icone nome="x" tamanho={14} /> Tirar
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
