import { filtroPersonagem } from "@/lib/identidade";

export type NomePose = "acenando" | "oi" | "pulando" | "pensando" | "bracos-abertos" | "andando" | "sentado" | "boas-vindas" | "pesquisando";

// Só a Cleo nova (redonda). Cada pose usa a imagem que mais combina com ela.
const IMAGEM: Record<NomePose, string> = {
  acenando:"/marca/cleo-acenando.png", oi:"/marca/cleo-acenando.png", "boas-vindas":"/marca/cleo-acenando.png", "bracos-abertos":"/marca/cleo-acenando.png",
  pulando:"/marca/cleo-pulando.png", andando:"/marca/cleo-pulando.png",
  pensando:"/marca/cleo.png", sentado:"/marca/cleo.png", pesquisando:"/marca/cleo.png",
};

/** Mascote oficial; o contexto da pose continua disponível para as animações da interface. */
export function Pose({ nome, largura, className, cor }: { nome: NomePose; largura: number; className?: string; cor?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={["pose", className].filter(Boolean).join(" ")} src={IMAGEM[nome] ?? "/marca/cleo.png"} data-pose={nome} alt="" width={largura} draggable={false} style={{ filter:cor ? filtroPersonagem(cor) : "var(--personagem-filtro, none)" }} />;
}
