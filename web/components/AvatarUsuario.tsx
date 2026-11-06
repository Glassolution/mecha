import { avatarValido, corPerfil, filtroPersonagem } from "@/lib/identidade";

export function AvatarUsuario({ avatar, cor, corPersonagem, tamanho = 36 }: { avatar?: string; cor?: string; corPersonagem?: string; tamanho?: number }) {
  return <span className="avatar-usuario" style={{ display: "inline-grid", placeItems: "center", flexShrink: 0, width: tamanho, height: tamanho, borderRadius: "50%", background: corPerfil(cor).cor }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/marca/cleo.png" data-avatar={avatarValido(avatar)} alt="" width={tamanho} height={tamanho} style={{ width: "90%", height: "90%", objectFit: "contain", filter:filtroPersonagem(corPersonagem) }} draggable={false}/>
  </span>;
}
