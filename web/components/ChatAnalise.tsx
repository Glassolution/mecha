"use client";

import { useEffect, useRef, useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import type { FichaVideo } from "@/lib/tipos";
import { useApp } from "./Contexto";
import { PERGUNTA_CRIATIVO, PERGUNTA_INICIAL } from "./ModelosAnalise";
import { PainelConversa, type MensagemConversa, type AnaliseAnterior } from "./PainelConversa";

export function ChatAnalise({ video }: { video: FichaVideo }) {
  const { eu } = useApp();
  const caminho = `/api/videos/${encodeURIComponent(video.id)}`;
  const { dados: salvas, carregando, erro: erroHistorico, recarregar } = useApi<MensagemConversa[]>(`${caminho}/conversa`);
  const { dados: anterior, carregando: carregandoAnterior } = useApi<AnaliseAnterior | null>(`${caminho}/analise`);
  const [novas, setNovas] = useState<MensagemConversa[]>([]);
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState<{ id: string; texto: string } | null>(null);
  const [respondendo, setRespondendo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const trava = useRef(false);
  const mensagens = Array.from(new Map([...(salvas ?? []), ...novas].map((m) => [m.id, m])).values());
  const exibidas: MensagemConversa[] = respondendo && pedido ? [...mensagens, { id: pedido.id, papel: "user", texto: pedido.texto }] : mensagens;

  async function enviar(pergunta: string, repetir = false) {
    const conteudo = pergunta.trim();
    if (!conteudo || conteudo.length > 4000 || trava.current || carregando || erroHistorico) return;
    trava.current = true;
    const envio = repetir && pedido ? pedido : { id: crypto.randomUUID(), texto: conteudo };
    setPedido(envio);
    setRespondendo(true);
    setFalha(null);
    setTexto("");
    try {
      const resposta = await api<MensagemConversa[]>(`${caminho}/conversa`, { method: "POST", json: { pedido_id: envio.id, texto: envio.texto } });
      const jaExibidas = new Set(mensagens.map(m=>m.id));
      setNovas((atuais) => [...atuais, ...resposta.map(m=>({...m,animar:m.papel === "assistant" && !jaExibidas.has(m.id)}))]);
      limparCache(`${caminho}/conversa`);
      setPedido(null);
    } catch (erro) {
      setTexto(envio.texto);
      setFalha((erro as Error).message || "Não foi possível responder agora. Tente novamente.");
    } finally {
      trava.current = false;
      setRespondendo(false);
    }
  }

  // vídeo ainda sem conversa nem análise: a Cleo já começa a analisar, sem esperar um clique
  const comecou = useRef(false);
  const vazio = !carregando && !carregandoAnterior && !erroHistorico && salvas?.length === 0 && !anterior && !novas.length;
  useEffect(() => {
    if (!vazio || comecou.current || !eu) return; // espera o perfil para saber o modo
    comecou.current = true;
    // o modo padrão vem do perfil (cadastro ou o seletor "Cleo" do chat)
    enviar(eu?.espaco.interesse === "achar_criativo" ? PERGUNTA_CRIATIVO : PERGUNTA_INICIAL);
  });

  return <PainelConversa video={video} mensagens={exibidas} anterior={anterior ?? null} texto={texto} mudarTexto={setTexto}
    enviar={(pergunta) => enviar(pergunta)} respondendo={respondendo} carregando={carregando} falha={erroHistorico?.message ?? falha}
    bloqueado={!!erroHistorico} tentarNovamente={() => erroHistorico ? recarregar() : pedido && enviar(pedido.texto, true)} />;
}
