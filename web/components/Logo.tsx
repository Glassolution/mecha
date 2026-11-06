import { IconeBru } from "./IconeBru";

/** A marca com o nome. A variante compacta usa o mascote oficial. */
export function Logo({ tamanho = 26, triangulo = false }: { tamanho?: number; triangulo?: boolean }) {
  const lado = Math.round(tamanho * 1.45);
  return (
    <span className="logo" aria-label="Cleo">
      {triangulo ? <IconeBru tamanho={lado} className="logo-bru logo-triangulo" /> : <img className="logo-bru" src="/marca/cleo-icone.png" alt="" width={lado} height={lado} />}
      <span className="logo-nome" style={{ fontSize: tamanho }} aria-hidden="true">
        Cleo
      </span>
    </span>
  );
}
