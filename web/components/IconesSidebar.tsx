import type { ReactNode } from "react";

// Desenhos próprios a partir dos contornos da referência da sidebar.
const desenhos: Record<string, ReactNode> = {
  inicio: <><path d="m2.5 9 9.5-6 9.5 6" /><path d="M4.5 8v12a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8" /></>,
  ajustes: <><path d="m9.4 3-.6 2.3-2 .9-2.2-.6-1.9 3.3 1.7 1.7v2.3l-1.7 1.7 1.9 3.3 2.2-.6 2 .9.6 2.3h3.8l.6-2.3 2-.9 2.2.6 1.9-3.3-1.7-1.7v-2.3l1.7-1.7L20 5.6l-2.2.6-2-.9-.6-2.3Z" /><circle cx="11.3" cy="11.8" r="3.2" /></>,
  ideias: <><path d="M8 18H4.8A2.8 2.8 0 0 1 2 15.2V6.8A2.8 2.8 0 0 1 4.8 4h14.4A2.8 2.8 0 0 1 22 6.8v8.4a2.8 2.8 0 0 1-2.8 2.8H15l-6 4" /><path d="M6.5 8.5h11M6.5 12h7" /></>,
  garimpo: <><rect x="2.5" y="3" width="19" height="18" rx="4" /><path d="m3 7 7.4 5a3 3 0 0 0 3.2 0L21 7" /></>,
  salvos: <><circle cx="11.5" cy="12" r="4.2" /><path d="M15.7 8v7a2.5 2.5 0 0 0 5 0v-3a9.5 9.5 0 1 0-4 7.8" /></>,
  estudio: <><path d="M11 20H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6M3 6l7.2 5a3.2 3.2 0 0 0 3.6 0L21 6" /><path d="m17 13 1.8 3.1 3.5.7-2.4 2.6.4 3.6-3.3-1.5-3.3 1.5.4-3.6-2.4-2.6 3.5-.7Z" /></>,
  busca: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
  avisos: <><path d="M5 16.5c2-2 2-4 2-7a5 5 0 0 1 10 0c0 3 0 5 2 7Z" /><path d="M10 20h4" /></>,
};

export function IconeSidebar({ nome }: { nome: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{desenhos[nome]}</svg>;
}
