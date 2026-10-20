/**
 * Ícones do quiz de boas-vindas: desenhos sólidos próprios em três tons (t1 cheio, t2 médio, t3 suave)
 * e recortes na cor do fundo do quadrinho (tf). Cada um tem uma parte que se mexe quando a opção
 * recebe o mouse (estilos em globals.css, `.q-*`).
 */
const DESENHOS = {
  // founder: o cubo do produto sendo montado
  founder: (
    <>
      <path className="t2" d="M3.5 8.9 11.2 13.1v8.5L3.5 17.4Z" />
      <path className="t3" d="M20.5 8.9 12.8 13.1v8.5l7.7-4.2Z" />
      <path className="t1 q-tampa" d="M12 2.8 20.5 7.4 12 12 3.5 7.4Z" />
    </>
  ),
  // empresário: a loja, com o toldo balançando
  empresario: (
    <>
      <rect className="t3" x="4.5" y="11.5" width="15" height="9" rx="1.6" />
      <rect className="t1" x="10" y="14.8" width="4" height="5.7" rx=".9" />
      <path className="t1 q-toldo" d="M3 9.4 4.8 4h14.4L21 9.4a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
    </>
  ),
  // investidor: barras subindo
  investidor: (
    <>
      <rect className="t3 q-barra" x="3.5" y="14" width="4.2" height="7" rx="1.3" />
      <rect className="t2 q-barra" x="9.9" y="9.5" width="4.2" height="11.5" rx="1.3" style={{ animationDelay: ".07s" }} />
      <rect className="t1 q-barra" x="16.3" y="4" width="4.2" height="17" rx="1.3" style={{ animationDelay: ".14s" }} />
    </>
  ),
  // só olhando: um olho atento ao que está em alta
  passeando: (
    <>
      <path className="t3" d="M1.8 12c2.7-4.7 6.1-7.2 10.2-7.2S19.5 7.3 22.2 12c-2.7 4.7-6.1 7.2-10.2 7.2S4.5 16.7 1.8 12Z" />
      <g className="q-iris">
        <circle className="t1" cx="12" cy="12" r="4.4" />
        <circle className="tf" cx="12" cy="12" r="1.8" />
      </g>
    </>
  ),
  // ideias: a janela de um app novo com a faísca da ideia
  ideias: (
    <>
      <rect className="t3" x="2" y="6" width="16" height="15" rx="3" />
      <path className="t2" d="M2 9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1.3H2Z" />
      <rect className="t2" x="5" y="13.2" width="6" height="1.9" rx=".95" />
      <rect className="t2" x="5" y="16.4" width="8.5" height="1.9" rx=".95" />
      <path className="t1 q-faisca" d="M18.6 1.4c.4 2.7 1.5 3.8 4.2 4.2-2.7.4-3.8 1.5-4.2 4.2-.4-2.7-1.5-3.8-4.2-4.2 2.7-.4 3.8-1.5 4.2-4.2Z" />
    </>
  ),
  // criativos: o vídeo vertical tocando e o coração de quem curtiu
  criativos: (
    <>
      <rect className="t3" x="3.5" y="2.5" width="11.5" height="19" rx="3" />
      <path className="t1" d="M7.6 8.9v6.2c0 .6.6.9 1.1.6l4.8-3.1c.4-.3.4-.9 0-1.2L8.7 8.3c-.5-.3-1.1 0-1.1.6Z" />
      <path className="t1 q-coracao recorte" d="M18.6 10.6s-3.6-2.1-3.6-4.5a1.9 1.9 0 0 1 3.6-.9 1.9 1.9 0 0 1 3.6.9c0 2.4-3.6 4.5-3.6 4.5Z" />
    </>
  ),
  // os dois: a janela do app atrás e o vídeo na frente
  os_dois: (
    <>
      <rect className="t3" x="1.5" y="3" width="15" height="12" rx="2.6" />
      <path className="t2" d="M1.5 5.6A2.6 2.6 0 0 1 4.1 3h9.8a2.6 2.6 0 0 1 2.6 2.6v1.6h-15Z" />
      <g className="q-sobe">
        <rect className="t1 recorte" x="12" y="8" width="10" height="14" rx="2.6" />
        <path className="tf" d="M15.6 12.4v4.4c0 .5.5.8.9.5l3.3-2.2c.3-.2.3-.7 0-.9l-3.3-2.2c-.4-.3-.9 0-.9.4Z" />
      </g>
    </>
  ),
  // já tenho SaaS: o app pronto, com o selo de check
  saas_sim: (
    <>
      <rect className="t3" x="2" y="3.5" width="19" height="16" rx="3" />
      <path className="t2" d="M2 6.5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v1.3H2Z" />
      <circle className="t1 recorte" cx="17.2" cy="16.8" r="5" />
      <path className="q-check" d="m14.9 16.9 1.6 1.6 3-3.2" />
    </>
  ),
  // ainda não: o espaço do app, tracejado, com o "+" para começar
  saas_nao: (
    <>
      <rect className="q-tracejado" x="2.8" y="3.8" width="18.4" height="16.4" rx="3" />
      <g className="q-mais">
        <circle className="t1" cx="12" cy="12" r="4.8" />
        <path className="q-mais-traco" d="M12 9.7v4.6M9.7 12h4.6" />
      </g>
    </>
  ),
  // lá fora: o globo com um ponto em órbita
  globo: (
    <>
      <circle className="t3" cx="11.5" cy="12.5" r="9" />
      <g className="q-meridianos">
        <ellipse cx="11.5" cy="12.5" rx="3.7" ry="9" />
        <path d="M2.5 12.5h18M4 8h15M4 17h15" />
      </g>
      <circle className="t1 recorte q-orbita" cx="19.8" cy="4.8" r="2.4" />
    </>
  ),
} as const;

export type NomeIconeQuiz = keyof typeof DESENHOS;

export function IconeQuiz({ nome, tamanho = 24 }: { nome: NomeIconeQuiz; tamanho?: number }) {
  return (
    <svg className="q-icone" width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      {DESENHOS[nome]}
    </svg>
  );
}
