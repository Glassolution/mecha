/** A Cleo triangular inteira, sem ampliar ou cortar as bordas da imagem. */
export function IconeBru({ tamanho = 32, className }: { tamanho?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/marca/bru.png" alt="" width={tamanho} height={tamanho} className={className} draggable={false} style={{ display: "block", objectFit: "contain", flexShrink: 0, filter: "var(--personagem-filtro, none)" }} />;
}
