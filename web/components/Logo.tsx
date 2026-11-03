import { IconeBru } from "./IconeBru";

/** A marca com o nome. `triangulo` usa a Cleo triangular, sem cortar a silhueta. */
export function Logo({ tamanho = 26, triangulo = false }: { tamanho?: number; triangulo?: boolean }) {
  const lado = Math.round(tamanho * 1.45);
  return (
    <span className="logo" aria-label="Cleo">
      {triangulo ? <IconeBru tamanho={lado} className="logo-bru logo-triangulo" /> : <img className="logo-bru" src="/marca/poses/logo.png" alt="" width={lado} height={lado} />}
      <span className="logo-nome" style={{ fontSize: tamanho }} aria-hidden="true">
        Cleo
      </span>
    </span>
  );
}
