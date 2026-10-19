import { api, ErroApi, limparCache } from "./api";

export type NovoGarimpo = {
  termos: string[];
  termos_idioma?: Record<string, string>;
  fontes?: string[];
  idiomas?: string[];
  modo: "ideia" | "criativo";
};

/** Cria o garimpo e devolve o id. Plano sem garimpos: lança ErroApi 402 com o texto do botão. */
export async function iniciarGarimpo(g: NovoGarimpo): Promise<string> {
  const r = await api<{ id: string }>("/api/garimpos", { method: "POST", json: g });
  limparCache("/api/eu");
  limparCache("/api/garimpos");
  return String(r.id);
}

export function separarTermos(texto: string): string[] {
  return texto
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export { ErroApi };
