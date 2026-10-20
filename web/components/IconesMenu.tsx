/** Ícones preenchidos do menu do perfil (desenho próprio, cor do texto). */
const DESENHOS = {
  inicio: <path d="M3 10.4 11.1 3.6a1.4 1.4 0 0 1 1.8 0L21 10.4V19.6A1.9 1.9 0 0 1 19.1 21.5H4.9A1.9 1.9 0 0 1 3 19.6Zm6 7.1a.9.9 0 0 0 .9.9h4.2a.9.9 0 0 0 0-1.8H9.9a.9.9 0 0 0-.9.9Z" fillRule="evenodd" />,
  ideias: (
    <>
      <path d="M12 2.5a6.9 6.9 0 0 0-4.3 12.3c.6.5 1 1.2 1 2V17h6.6v-.2c0-.8.4-1.5 1-2A6.9 6.9 0 0 0 12 2.5Z" />
      <path d="M8.9 18.6h6.2v.9a2 2 0 0 1-2 2h-2.2a2 2 0 0 1-2-2Z" />
    </>
  ),
  garimpo: <path d="M10.6 2.8a7.8 7.8 0 0 1 6.2 12.5l4.1 4.1a1.1 1.1 0 0 1-1.6 1.6l-4.1-4.1A7.8 7.8 0 1 1 10.6 2.8Zm0 3a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z" fillRule="evenodd" />,
  salvos: <path d="M6.5 2.8h11A1.7 1.7 0 0 1 19.2 4.5v16a.8.8 0 0 1-1.2.7L12 17.6l-6 3.6a.8.8 0 0 1-1.2-.7v-16A1.7 1.7 0 0 1 6.5 2.8Z" />,
  estudio: (
    <>
      <path d="M10.5 2.5c.6 4.6 2.6 6.6 7.2 7.2-4.6.6-6.6 2.6-7.2 7.2-.6-4.6-2.6-6.6-7.2-7.2 4.6-.6 6.6-2.6 7.2-7.2Z" />
      <path d="M18.3 14.2c.3 2.3 1.3 3.3 3.6 3.6-2.3.3-3.3 1.3-3.6 3.6-.3-2.3-1.3-3.3-3.6-3.6 2.3-.3 3.3-1.3 3.6-3.6Z" />
    </>
  ),
  ajustes: (
    <>
      <rect x="3" y="5" width="18" height="2.6" rx="1.3" />
      <rect x="3" y="11.2" width="18" height="2.6" rx="1.3" />
      <rect x="3" y="17.4" width="18" height="2.6" rx="1.3" />
      <circle cx="8" cy="6.3" r="2.9" />
      <circle cx="16" cy="12.5" r="2.9" />
      <circle cx="10" cy="18.7" r="2.9" />
    </>
  ),
  plano: (
    <>
      <rect x="3" y="13" width="4.6" height="8" rx="1.4" />
      <rect x="9.7" y="8" width="4.6" height="13" rx="1.4" />
      <rect x="16.4" y="3" width="4.6" height="18" rx="1.4" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="7.8" r="4.3" />
      <path d="M3.9 20.1c.7-4.1 4-6.8 8.1-6.8s7.4 2.7 8.1 6.8a1 1 0 0 1-1 1.2H4.9a1 1 0 0 1-1-1.2Z" />
    </>
  ),
  negocio: (
    <>
      <path d="M3.4 9.3 5 4.6a1.6 1.6 0 0 1 1.5-1.1h11a1.6 1.6 0 0 1 1.5 1.1l1.6 4.7a3 3 0 0 1-5.3 2.3 3 3 0 0 1-4.6 0 3 3 0 0 1-5.3-2.3Z" />
      <path d="M5 13.5a4.6 4.6 0 0 0 3.5-.7 4.5 4.5 0 0 0 7 0 4.6 4.6 0 0 0 3.5.7v6A1.5 1.5 0 0 1 17.5 21H14v-4.6h-4V21H6.5A1.5 1.5 0 0 1 5 19.5Z" />
    </>
  ),
  assuntos: <path d="M3 4.6A1.6 1.6 0 0 1 4.6 3h6.3a1.6 1.6 0 0 1 1.1.5l8.5 8.5a1.6 1.6 0 0 1 0 2.3l-6.3 6.3a1.6 1.6 0 0 1-2.3 0L3.5 12.1a1.6 1.6 0 0 1-.5-1.2Zm4.6 1.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z" fillRule="evenodd" />,
  conta: <path d="M7 10V7.6a5 5 0 0 1 10 0V10h.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10Zm2.4 0h5.2V7.6a2.6 2.6 0 0 0-5.2 0Z" fillRule="evenodd" />,
  conexoes: <path d="M9 2.5a1 1 0 0 1 1 1V7h4V3.5a1 1 0 1 1 2 0V7h1a1 1 0 0 1 1 1v3a6 6 0 0 1-5 5.9V21a1 1 0 1 1-2 0v-4.1A6 6 0 0 1 6 11V8a1 1 0 0 1 1-1h1V3.5a1 1 0 0 1 1-1Z" />,
} as const;

export type NomeIconeMenu = keyof typeof DESENHOS;

export function IconeMenu({ nome, tamanho = 18 }: { nome: NomeIconeMenu; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {DESENHOS[nome]}
    </svg>
  );
}
