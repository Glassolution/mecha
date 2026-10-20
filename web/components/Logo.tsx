// Logo: a marca em PNG (nuvem com lupa) + o nome "mecha". Os PNGs saem de web/marca/gerar.py.
// No tema escuro aparece a nuvem branca; no claro, a preta.
export function Logo({ tamanho = 26 }: { tamanho?: number }) {
  const lado = Math.round(tamanho * 1.45);
  return (
    <span className="logo" aria-label="mecha">
      <img className="logo-png logo-clara" src="/marca/mecha-branca.png" alt="" width={lado} height={lado} />
      <img className="logo-png logo-escura" src="/marca/mecha-preta.png" alt="" width={lado} height={lado} />
      <span className="logo-nome" style={{ fontSize: tamanho }} aria-hidden="true">
        mecha
      </span>
    </span>
  );
}
