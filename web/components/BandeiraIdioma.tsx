import { Icone } from "./Icone";

/** Ícones decorativos: o nome do idioma permanece visível ao lado. */
export function BandeiraIdioma({ idioma }: { idioma: "pt" | "en" | "todos" }) {
  if (idioma === "todos") return <span className="bandeira-idioma bandeira-globo" aria-hidden="true"><Icone nome="globo" tamanho={20} /></span>;

  return (
    <svg className="bandeira-idioma" viewBox="0 0 28 20" width="24" height="18" aria-hidden="true" focusable="false">
      {idioma === "pt" ? <>
        <path fill="#168447" d="M0 0h28v20H0z" />
        <path fill="#ffdc43" d="m14 2 12 8-12 8L2 10z" />
        <circle cx="14" cy="10" r="4.7" fill="#24488c" />
        <path d="M9.5 8.8c3-.2 6 .8 8.9 2.7" fill="none" stroke="#fff" strokeWidth="1.1" />
        <g fill="#fff"><circle cx="12" cy="11" r=".35" /><circle cx="14.5" cy="12.6" r=".35" /><circle cx="16.5" cy="11.8" r=".35" /><circle cx="14" cy="8" r=".3" /></g>
      </> : <>
        <path fill="#fff" d="M0 0h28v20H0z" />
        {Array.from({ length: 7 }, (_, i) => <path key={i} fill="#c94450" d={`M0 ${i * 40 / 13}h28v${20 / 13}H0z`} />)}
        <path fill="#334777" d="M0 0h12v10.8H0z" />
        <g fill="#fff">{Array.from({ length: 5 }, (_, y) => Array.from({ length: y % 2 ? 4 : 5 }, (_, x) => <circle key={`${y}-${x}`} cx={1.3 + x * 2.3 + (y % 2 ? 1.1 : 0)} cy={1.3 + y * 2} r=".5" />))}</g>
      </>}
    </svg>
  );
}
