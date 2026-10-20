export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("pt-BR")} mil`;
  return n.toLocaleString("pt-BR");
}

export function pct(c: number | null | undefined): string {
  if (c === null || c === undefined) return "medindo";
  const v = Math.round(c * 100);
  return `${v >= 0 ? "+" : ""}${v}% em 7 dias`;
}

export function mmss(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function capaUrl(capa: string | null | undefined): string | null {
  return capa ? (capa.startsWith("/") ? capa : `/api/capas/${capa}`) : null;
}

export const PLATAFORMA: Record<string, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  tiktok_ads: "TikTok Ads",
  meta_ads: "Facebook",
  instagram: "Instagram",
};

export const MODELO: Record<string, string> = {
  assinatura: "Assinatura",
  freemium: "Freemium",
  uso: "Por uso",
  unico: "Pagamento único",
  desconhecido: "Desconhecido",
};

export const IDIOMA: Record<string, string> = { pt: "Português", en: "Inglês", es: "Espanhol" };

export function tiktokId(id: string): string | null {
  return id.startsWith("tt:") ? id.slice(3) : null;
}

/** Código do Reel ("ig:DOq0Ui7jxaz" -> "DOq0Ui7jxaz"), para o player oficial do Instagram. */
export function instagramCodigo(id: string): string | null {
  return id.startsWith("ig:") ? id.slice(3) : null;
}

/** Ícone de cada fonte de vídeo. */
export const ICONE_FONTE: Record<string, string> = { tiktok: "tiktok", instagram: "instagram", youtube: "youtube", tiktok_ads: "anuncio", meta_ads: "anuncio" };

export function quando(iso: string | null | undefined): string {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias < 1) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 365) return `há ${Math.floor(dias / 30)} ${Math.floor(dias / 30) === 1 ? "mês" : "meses"}`;
  return `há ${Math.floor(dias / 365)} ${Math.floor(dias / 365) === 1 ? "ano" : "anos"}`;
}
