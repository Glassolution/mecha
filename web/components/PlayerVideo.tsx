import { capaUrl, instagramCodigo, tiktokId } from "@/lib/fmt";
import type { FichaVideo } from "@/lib/tipos";
import { playerTikTok } from "./Cartoes";

/** Player oficial da plataforma (o vídeo nunca é copiado); sem player, a capa. */
export function PlayerVideo({ v, tocar = true }: { v: FichaVideo; tocar?: boolean }) {
  const tt = tiktokId(v.id);
  const ig = instagramCodigo(v.id);
  if (tt) return <iframe src={playerTikTok(tt, true).replace("autoplay=1", `autoplay=${tocar ? 1 : 0}`)} title={`Vídeo de ${v.autor}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />;
  if (ig) return <iframe className="fv-instagram" src={`https://www.instagram.com/reel/${ig}/embed/`} title={`Reel de ${v.autor}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />;
  if (v.capa) return <img src={capaUrl(v.capa)!} alt="" />;
  return <div className="capa-vazia" />;
}
