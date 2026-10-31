import type { CSSProperties } from "react";

export const AVATARES = [
  { id: "acenando", nome: "Acolhedora", cor: "amarelo" },
  { id: "pensando", nome: "Pensadora", cor: "coral" },
  { id: "pesquisando", nome: "Exploradora", cor: "salvia" },
  { id: "bracos-abertos", nome: "Criativa", cor: "azul" },
  { id: "andando", nome: "Em movimento", cor: "laranja" },
  { id: "pulando", nome: "Entusiasmada", cor: "lilas" },
  { id: "sentado", nome: "Tranquila", cor: "menta" },
  { id: "oi", nome: "Simpática", cor: "rosa" },
] as const;
export type AvatarId = typeof AVATARES[number]["id"];
export const CORES_PERFIL = [
  { id: "amarelo", nome: "Amarelo Wae", cor: "#f5cf32" },
  { id: "coral", nome: "Coral", cor: "#f18a6c" },
  { id: "salvia", nome: "Sálvia", cor: "#a3b38f" },
  { id: "azul", nome: "Azul", cor: "#72bbd0" },
  { id: "laranja", nome: "Laranja", cor: "#e49a57" },
  { id: "lilas", nome: "Lilás", cor: "#b49bd3" },
  { id: "rosa", nome: "Rosa", cor: "#df858b" },
] as const;
export type CorPerfilId = typeof CORES_PERFIL[number]["id"];
const CORES_PERSONAGEM = [...CORES_PERFIL, { id:"menta", nome:"Verde-água", cor:"#72c8ac" }] as const;
export type CorPersonagemId = typeof CORES_PERSONAGEM[number]["id"];
export function avatarValido(id?: string): AvatarId { return AVATARES.find(a => a.id === id)?.id ?? "acenando"; }
export function corPerfil(id?: string) { return CORES_PERFIL.find(c => c.id === id) ?? CORES_PERFIL[0]; }
export function corDaPersonagem(id?: string) { return CORES_PERSONAGEM.find(c => c.id === id) ?? CORES_PERSONAGEM[0]; }

// Recolore as poses existentes, preservando transparência, textura e óculos.
const FILTROS_PERSONAGEM: Record<CorPersonagemId, string> = {
  amarelo: "none",
  coral: "hue-rotate(-38deg) saturate(.65)",
  salvia: "hue-rotate(48deg) saturate(.32)",
  azul: "hue-rotate(145deg) saturate(.55)",
  laranja: "hue-rotate(-18deg) saturate(.85)",
  lilas: "hue-rotate(215deg) saturate(.45)",
  rosa: "hue-rotate(280deg) saturate(.5)",
  menta: "hue-rotate(100deg) saturate(.5)",
};
export function filtroPersonagem(id?: string) { return FILTROS_PERSONAGEM[corDaPersonagem(id).id]; }

/** A mesma cor principal acompanha o cadastro e o espaço autenticado. */
export function estiloTema(id?: string, corPersonagem?: string): CSSProperties {
  return {
    "--principal": corPerfil(id).cor,
    "--principal-hover": "color-mix(in srgb, var(--principal), black 7%)",
    "--principal-suave": "color-mix(in srgb, var(--principal) 18%, white)",
    "--principal-borda": "color-mix(in srgb, var(--principal) 60%, white)",
    "--principal-texto": "color-mix(in srgb, var(--principal) 40%, #25251f)",
    "--personagem-filtro": filtroPersonagem(corPersonagem),
    "--destaque": "var(--principal)",
    "--destaque-luz": "var(--principal-suave)",
    "--marca": "var(--principal)",
    "--marca-suave": "var(--principal-suave)",
    "--on-destaque": "#25251f",
    "--on-marca": "#25251f",
  } as CSSProperties;
}
