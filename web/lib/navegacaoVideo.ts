/** Só listas internas podem ser destino da seta; nunca outro vídeo ou um site externo. */
export function origemDosVideos(valor?: string | null): string | null {
  if (!valor || !valor.startsWith("/") || /[\\\r\n]/.test(valor)) return null;
  const base = "https://cleo.local";
  try {
    const url = new URL(valor, base);
    if (url.origin !== base || !/^\/(pesquisa|explorar|ideias|salvos(?:\/[a-zA-Z0-9_-]+)?|garimpo\/[a-zA-Z0-9_-]+)$/.test(url.pathname)) return null;
    url.searchParams.delete("nova"); // voltar aos resultados não é iniciar uma nova busca
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

export function retornoDosVideos(origem?: string | null, garimpoId?: string | null): string {
  return origemDosVideos(origem) ?? (garimpoId ? origemDosVideos(`/garimpo/${garimpoId}`) : null) ?? "/pesquisa";
}

function rota(id: string, analisar: boolean, origem?: string | null) {
  const lista = origemDosVideos(origem);
  return `/video/${encodeURIComponent(id)}${analisar ? "/analise" : ""}${lista ? `?origem=${encodeURIComponent(lista)}` : ""}`;
}
export const rotaAssistir = (id: string, origem?: string | null) => rota(id, false, origem);
export const rotaAnalisar = (id: string, origem?: string | null) => rota(id, true, origem);
