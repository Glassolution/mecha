import type { ReactNode } from "react";
import styles from "./MolduraCelular.module.css";

/** Moldura enviada pelo usuário; o player mantém seu formato e os controles livres. */
export function MolduraCelular({ children }: { children: ReactNode }) {
  return <div className={styles.celular}>
    <div className={styles.tela}>
      <div className={styles.player}>{children}</div>
    </div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.moldura} src="/molduras/iphone.png" alt="" width={350} height={350} draggable={false} aria-hidden="true" />
  </div>;
}
