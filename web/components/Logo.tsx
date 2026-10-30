export function Logo({ tamanho = 26 }: { tamanho?: number }) {
  const lado = Math.round(tamanho * 1.45);
  return (
    <span className="logo" aria-label="Bru">
      <img className="logo-bru" src="/marca/bru.png" alt="" width={lado} height={lado} />
      <span className="logo-nome" style={{ fontSize: tamanho }} aria-hidden="true">
        Bru
      </span>
    </span>
  );
}
