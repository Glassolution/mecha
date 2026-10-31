"use client";

import { Suspense } from "react";
import { useApi } from "@/lib/api";
import type { Eu } from "@/lib/tipos";
import { Quiz } from "./Quiz";
import styles from "./cadastro.module.css";

export default function PaginaBoasVindas() {
  return (
    <Suspense fallback={<main className={styles.carregando} role="status">Preparando seu perfil…</main>}>
      <BoasVindas />
    </Suspense>
  );
}

function BoasVindas() {
  const { dados: eu, erro, recarregar } = useApi<Eu>("/api/eu");
  if (erro) return <main className={styles.carregando}><p>Não foi possível abrir o cadastro.</p><button onClick={recarregar}>Tentar novamente</button></main>;
  if (!eu) {
    return (
      <main className={styles.carregando} role="status">Preparando seu perfil…</main>
    );
  }
  return <Quiz eu={eu} />;
}

