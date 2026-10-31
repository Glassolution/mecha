/** Aceita apenas caminhos internos, sem permitir troca de origem ou ciclos no login. */
export function destinoSeguro(proximo: string | null, padrao = "/inicio"): string {
  if (!proximo || !proximo.startsWith("/") || /[\\\r\n]/.test(proximo)) return padrao;
  try {
    const base = "https://bru.local";
    const url = new URL(proximo, base);
    if (url.origin !== base || /^\/(entrar|auth\/confirmar)(\/|$)/.test(url.pathname)) return padrao;
    return url.pathname + url.search + url.hash;
  } catch {
    return padrao;
  }
}
