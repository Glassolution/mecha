import { num } from "@/lib/fmt";
import type { FichaVideo } from "@/lib/tipos";
import { Icone } from "./Icone";

/** Os seis números do vídeo em quadradinhos, para painéis estreitos. */
export function NumerosVideo({ v }: { v: FichaVideo }) {
  const itens: [string, string, number | null][] = [
    ["olho", "Views", v.views], ["sobe", "Por dia", v.views_dia], ["coracao", "Curtidas", v.likes],
    ["fala", "Comentários", v.comentarios], ["compartilhar", "Compartilhados", v.compartilhamentos], ["salvo", "Salvamentos", v.salvamentos],
  ];
  return (
    <dl className="an-numeros">
      {itens.map(([ic, k, n]) => (
        <div key={k}><dt><Icone nome={ic} tamanho={13} /> {k}</dt><dd>{n === null || n === undefined ? "—" : num(n)}</dd></div>
      ))}
    </dl>
  );
}
