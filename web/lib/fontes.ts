// Onde a pessoa prefere buscar (TikTok, Instagram): lembrado só neste navegador.
import { useEffect, useState } from "react";

export const FONTES_VIDEO = [
  { id: "tiktok", nome: "TikTok" },
  { id: "instagram", nome: "Instagram" },
] as const;

const CHAVE = "mecha:fontes";
const PADRAO = FONTES_VIDEO.map((f) => f.id as string);

function ler(): string[] {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    const validas = Array.isArray(salvas) ? salvas.filter((f) => PADRAO.includes(f)) : [];
    return validas.length ? validas : PADRAO;
  } catch {
    return PADRAO;
  }
}

/** As fontes escolhidas e como ligar/desligar uma (sempre fica pelo menos uma ligada). */
export function useFontes() {
  const [fontes, setFontes] = useState<string[]>(PADRAO);
  useEffect(() => {
    const t = setTimeout(() => setFontes(ler()), 0);
    return () => clearTimeout(t);
  }, []);
  function guardar(novas: string[]) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novas));
    } catch {}
    return novas;
  }
  function alternar(id: string) {
    setFontes((atuais) => guardar(atuais.includes(id) ? (atuais.length > 1 ? atuais.filter((f) => f !== id) : atuais) : [...atuais, id]));
  }
  // escolha única: todas as fontes ou só uma
  const escolha: EscolhaFonte = fontes.length > 1 ? "todas" : (fontes[0] as EscolhaFonte);
  function escolher(e: EscolhaFonte) {
    setFontes(guardar(e === "todas" ? PADRAO : [e]));
  }
  return { fontes, alternar, escolha, escolher };
}

export type EscolhaFonte = "todas" | "tiktok" | "instagram";
