"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icone } from "./Icone";
import { IconePasta } from "./IconesSidebar";
import styles from "./Colecoes.module.css";

/** O diálogo nativo mantém o foco na janela e permite fechar com Escape. */
export function JanelaColecao({ titulo, descricao, fechar, children }: { titulo: string; descricao: string; fechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const janela = ref.current;
    janela?.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { janela?.close(); document.body.style.overflow = anterior; };
  }, []);
  return <dialog ref={ref} className={styles.janela} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-descricao`} onCancel={(e) => {e.preventDefault();fechar();}} onClick={(e) => {if (e.target === e.currentTarget) fechar();}}>
    <div className={styles.janelaInterior}>
      <header className={styles.janelaTopo}><span className={styles.emblema}><IconePasta cor="#b38c1c" tamanho={23}/></span><button className={styles.fechar} onClick={fechar} aria-label="Fechar"><Icone nome="x" tamanho={18}/></button></header>
      <div className={styles.janelaTitulo}><h2 id={`${id}-titulo`}>{titulo}</h2><p id={`${id}-descricao`}>{descricao}</p></div>
      {children}
    </div>
  </dialog>;
}
