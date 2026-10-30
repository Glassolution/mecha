import { PLATAFORMA } from "@/lib/fmt";
import { Icone } from "./Icone";

/** Selo da rede do vídeo, nas cores da marca: TikTok em preto com o brilho azul e rosa, Instagram no degradê. */
export function SeloFonte({ fonte, soIcone = false }: { fonte: string; soIcone?: boolean }) {
  const nome = PLATAFORMA[fonte] ?? fonte;
  if (fonte !== "tiktok" && fonte !== "instagram") {
    return <span className="selo-fonte">{nome}</span>;
  }
  return (
    <span className={`selo-fonte ${fonte}${soIcone ? " so-icone" : ""}`} title={nome} aria-label={nome}>
      <Icone nome={fonte} tamanho={13} traco={2} />
      {!soIcone && <span>{nome}</span>}
    </span>
  );
}
