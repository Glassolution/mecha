"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/api";
import type { FichaVideo } from "@/lib/tipos";
import { Vazio } from "@/components/Cartoes";
import { ChatAnalise } from "@/components/ChatAnalise";

export default function AnalisarVideo() {
  const { id } = useParams<{ id: string }>();
  const { dados: video, erro } = useApi<FichaVideo>(`/api/videos/${encodeURIComponent(decodeURIComponent(id))}`);
  if (erro) return <Vazio titulo="Não foi possível abrir o vídeo." texto="Tente abrir novamente pela pesquisa." acao={<Link className="bt1" href="/pesquisa">Voltar à pesquisa</Link>} />;
  if (!video) return <div className="ac-carregando" role="status">Abrindo a conversa com a Cleo…</div>;
  return <ChatAnalise key={video.id} video={video} />;
}
