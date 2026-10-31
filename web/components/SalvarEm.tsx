"use client";

import { useEffect, useRef, useState } from "react";
import { api, limparCache } from "@/lib/api";
import type { Colecao } from "@/lib/tipos";
import { useApp } from "./Contexto";
import { Icone } from "./Icone";
import { IconePasta } from "./IconesSidebar";
import { JanelaColecao } from "./JanelaColecao";
import styles from "./Colecoes.module.css";

/** Selecionar uma pasta salva imediatamente; criar uma pasta também salva o item. */
export function SalvarEm({ tipo, id, fechar, aoMudar }: { tipo: "video" | "ideia" | "analise"; id: string; fechar: () => void; aoMudar?: (salvo: boolean) => void }) {
  const { avisar } = useApp();
  const [colecoes, setColecoes] = useState<Colecao[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState("");
  const [criando, setCriando] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCarga, setErroCarga] = useState(false);
  const trava = useRef(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([api<Colecao[]>("/api/colecoes"), api<string[]>(`/api/salvos/onde?item_tipo=${tipo}&item_id=${encodeURIComponent(id)}`)])
      .then(([cols, onde]) => {if (vivo) {setColecoes(cols);setMarcadas(new Set(onde.map(String)));}})
      .catch((e: Error) => {if (vivo) {setErro(e.message);setErroCarga(true);}});
    return () => {vivo = false;};
  }, [tipo, id]);

  async function salvar(c: Colecao, ja: boolean) {
    if (ja) await api(`/api/salvos/${c.id}/${tipo}/${encodeURIComponent(id)}`, { method: "DELETE" });
    else await api("/api/salvos", { method: "POST", json: { colecao_id: String(c.id), item_tipo: tipo, item_id: id } });
    const prox = new Set(marcadas);
    if (ja) prox.delete(String(c.id)); else prox.add(String(c.id));
    setMarcadas(prox);
    setColecoes(cs => cs?.map(x => String(x.id) === String(c.id) ? {...x, itens: Math.max(0, Number(x.itens) + (ja ? -1 : 1))} : x) ?? cs);
    limparCache("/api/colecoes");
    limparCache(`/api/salvos/onde?item_tipo=${tipo}&item_id=${encodeURIComponent(id)}`);
    aoMudar?.(prox.size > 0);
    avisar(ja ? `Tirado de ${c.nome}` : `Salvo em ${c.nome}`);
  }

  async function alternar(c: Colecao) {
    if (trava.current) return;
    trava.current = true;
    setOcupada(String(c.id));setErro(null);
    try {await salvar(c, marcadas.has(String(c.id)));}
    catch (e) {setErro((e as Error).message);}
    finally {trava.current = false;setOcupada(null);}
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.trim() || trava.current || erroCarga) return;
    trava.current = true;setCriando(true);setErro(null);
    try {
      const c = await api<Colecao>("/api/colecoes", { method: "POST", json: { nome: nova.trim() } });
      const completa = {...c, itens: 0, capas: []};
      setColecoes(cs => [...(cs ?? []), completa]);
      setNova("");setBusca("");
      limparCache("/api/colecoes");
      await salvar(completa, false);
    } catch (e) {setErro((e as Error).message);}
    finally {trava.current = false;setCriando(false);}
  }

  const filtradas = colecoes?.filter(c => c.nome.toLocaleLowerCase().includes(busca.trim().toLocaleLowerCase()));
  const ocupado = criando || ocupada !== null;
  return <JanelaColecao titulo={tipo === "analise" ? "Salvar análise" : "Salvar em uma pasta"} descricao={tipo === "analise" ? "Escolha uma pasta para voltar à análise e à conversa deste vídeo em Salvos." : `Organize ${tipo === "video" ? "este vídeo" : "esta ideia"} nas suas coleções.`} fechar={fechar}>
    {!!colecoes?.length && <label className={styles.buscaModal}><Icone nome="busca" tamanho={16}/><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pasta…" aria-label="Buscar pasta"/></label>}
    <div className={styles.listaPastas} aria-busy={colecoes === null && !erroCarga}>
      {colecoes === null && !erroCarga && <div className={styles.carregando} role="status" aria-label="Carregando pastas">{[0,1,2].map(n => <span key={n} className="esqueleto"/>)}</div>}
      {colecoes?.length === 0 && <div className={styles.pastasVazias}><span className={styles.pastaVaziaIcone}><IconePasta cor="#c3a347" tamanho={42}/></span><h3>Sua primeira pasta começa aqui</h3><p>Crie uma coleção por nicho, cliente ou projeto.</p></div>}
      {!!colecoes?.length && <span className={styles.rotuloLista}>SUAS PASTAS <small>{colecoes.length}</small></span>}
      {filtradas?.map(c => {const marcada = marcadas.has(String(c.id));return <button key={c.id} className={styles.pastaLinha} aria-pressed={marcada} disabled={ocupado} onClick={() => alternar(c)}><span className={styles.pastaLinhaIcone}><IconePasta cor={marcada ? "#ad8517" : "#b7a371"} tamanho={24}/></span><span className={styles.pastaNome}><b>{c.nome}</b><small>{c.itens} {Number(c.itens) === 1 ? "item" : "itens"}{marcada ? " · Salvo aqui" : ""}</small></span>{ocupada === String(c.id) ? <i className={styles.spinner} aria-label="Salvando"/> : <span className={styles.selecao}>{marcada && <Icone nome="check" tamanho={13} traco={2.2}/>}</span>}</button>;})}
      {!!colecoes?.length && filtradas?.length === 0 && <p className={styles.semBusca}>Nenhuma pasta com esse nome.</p>}
    </div>
    {erro && <p className={styles.erro} role="alert">{erro}</p>}
    <form className={styles.criarInline} onSubmit={criar}><label htmlFor="nova-pasta-salvar">Nova pasta</label><div><span><Icone nome="mais" tamanho={15}/><input id="nova-pasta-salvar" value={nova} onChange={e => setNova(e.target.value)} placeholder="Ex.: Ideias para meu próximo SaaS" maxLength={60} disabled={ocupado || erroCarga || colecoes === null}/></span><button className={styles.primario} disabled={!nova.trim() || ocupado || erroCarga || colecoes === null}>{criando ? "Criando…" : "Criar e salvar"}</button></div></form>
    <footer className={styles.janelaRodape}><span>{marcadas.size ? `Salvo em ${marcadas.size} ${marcadas.size === 1 ? "pasta" : "pastas"}` : "Selecione uma pasta para salvar"}</span><button className={styles.secundario} onClick={fechar}>Concluído<Icone nome="check" tamanho={13}/></button></footer>
  </JanelaColecao>;
}
