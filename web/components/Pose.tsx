import { filtroPersonagem } from "@/lib/identidade";

export type NomePose = "acenando" | "oi" | "pulando" | "pensando" | "bracos-abertos" | "andando" | "sentado" | "boas-vindas" | "pesquisando";

/** Mascote oficial; o contexto da pose continua disponível para as animações da interface. */
export function Pose({ nome, largura, className, cor }: { nome: NomePose; largura: number; className?: string; cor?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={["pose", className].filter(Boolean).join(" ")} src="/marca/cleo.png" data-pose={nome} alt="" width={largura} draggable={false} style={{ filter:cor ? filtroPersonagem(cor) : "var(--personagem-filtro, none)" }} />;
}
