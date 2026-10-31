import { filtroPersonagem } from "@/lib/identidade";

export type NomePose = "acenando" | "oi" | "pulando" | "pensando" | "bracos-abertos" | "andando" | "sentado" | "boas-vindas" | "pesquisando";

/** A Wae em tricô, numa das poses recortadas em /marca/poses. A largura manda; a altura segue a imagem. */
export function Pose({ nome, largura, className, cor }: { nome: NomePose; largura: number; className?: string; cor?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={["pose", className].filter(Boolean).join(" ")} src={`/marca/poses/${nome}.png`} alt="" width={largura} draggable={false} style={{ filter:cor ? filtroPersonagem(cor) : "var(--personagem-filtro, none)" }} />;
}
