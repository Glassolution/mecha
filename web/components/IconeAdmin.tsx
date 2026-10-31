import type { ReactNode } from "react";

const desenhos: Record<string, ReactNode> = {
  visao: <><path d="M3 11a4 4 0 0 1 1.3-3L9 3.8a4.5 4.5 0 0 1 6 0L19.7 8a4 4 0 0 1 1.3 3v7a3 3 0 0 1-3 3h-2v-7a4 4 0 0 0-8 0v7H6a3 3 0 0 1-3-3Z"/></>,
  usuarios: <><rect x="3" y="3" width="6.5" height="6.5" rx="1.3"/><rect x="14.5" y="3" width="6.5" height="6.5" rx="1.3"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1.3"/><rect x="14.5" y="14.5" width="6.5" height="6.5" rx="1.3"/></>,
  garimpos: <><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><path d="m6.5 8 1.4 1.4L10.5 6.5M14 8h3.5M6.5 15h3.5M14 15h3.5"/></>,
  biblioteca: <><circle cx="12" cy="4.8" r="2.8"/><circle cx="5" cy="17.5" r="3"/><circle cx="19" cy="17.5" r="3"/><path d="m9.2 10.2-1.7 2.5m7.3-2.5 1.7 2.5"/></>,
  config: <><path d="m9.4 3-.6 2.2-2 .9-2.1-.5L2.8 9l1.6 1.6v2.8L2.8 15l1.9 3.4 2.1-.5 2 .9.6 2.2h5.2l.6-2.2 2-.9 2.1.5 1.9-3.4-1.6-1.6v-2.8L21.2 9l-1.9-3.4-2.1.5-2-.9-.6-2.2Z"/><circle cx="12" cy="12" r="3"/></>,
  ajuda: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
  voltar: <><circle cx="12" cy="12" r="9"/><path d="M8.5 12h7"/></>,
};

export function IconeAdmin({nome}:{nome:string}) {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{desenhos[nome]}</svg>;
}
