// Logo provisória: nuvem com olhos e um brilho + nome arredondado. Desenho próprio (docs/decisoes.md, item 6).
export function Nuvem({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg width={tamanho * 1.25} height={tamanho} viewBox="0 0 50 40" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="14" cy="24" r="10" />
        <circle cx="24" cy="15" r="12" />
        <circle cx="35" cy="22" r="10.5" />
        <rect x="6" y="22" width="38" height="14" rx="7" />
      </g>
      <g style={{ fill: "var(--bg)" }}>
        <ellipse cx="20" cy="24" rx="3.6" ry="4.6" />
        <ellipse cx="30" cy="24" rx="3.6" ry="4.6" />
      </g>
      <g fill="currentColor">
        <ellipse cx="20.9" cy="22.3" rx="1.5" ry="1.9" />
        <ellipse cx="30.9" cy="22.3" rx="1.5" ry="1.9" />
      </g>
      <path
        fill="currentColor"
        d="M44 0.5c.5 3.2 1.3 4 4.5 4.5-3.2.5-4 1.3-4.5 4.5-.5-3.2-1.3-4-4.5-4.5 3.2-.5 4-1.3 4.5-4.5z"
      />
    </svg>
  );
}

export function Logo({ tamanho = 26 }: { tamanho?: number }) {
  return (
    <span className="logo" aria-label="radar">
      <Nuvem tamanho={tamanho} />
      <span className="logo-nome" style={{ fontSize: tamanho }} aria-hidden="true">
        radar
      </span>
    </span>
  );
}
