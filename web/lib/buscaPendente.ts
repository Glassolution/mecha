// A busca que o visitante digitou antes de entrar: fica guardada no navegador e roda depois do login.
const CHAVE = "mecha:busca-pendente";

export type BuscaPendente = { texto: string; modo: "ideia" | "criativo" };

export function guardarBusca(b: BuscaPendente) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...b, em: Date.now() }));
  } catch {}
}

/** A busca guardada, se tiver menos de 1 dia. */
export function lerBusca(): BuscaPendente | null {
  try {
    const b = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (!b || typeof b.texto !== "string" || Date.now() - (b.em ?? 0) > 86_400_000) return null;
    return { texto: b.texto, modo: b.modo === "criativo" ? "criativo" : "ideia" };
  } catch {
    return null;
  }
}

export function esquecerBusca() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {}
}
