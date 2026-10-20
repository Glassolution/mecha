"use client";

import { Suspense } from "react";
import { useApi } from "@/lib/api";
import type { Eu } from "@/lib/tipos";
import { Quiz } from "./Quiz";

export default function PaginaBoasVindas() {
  return (
    <Suspense fallback={null}>
      <BoasVindas />
    </Suspense>
  );
}

function BoasVindas() {
  const { dados: eu } = useApi<Eu>("/api/eu");
  if (!eu) {
    return (
      <main className="quiz-pagina">
        <div className="quiz-lado"><div className="esqueleto quiz-esq" style={{ height: 420 }} /></div>
        <div className="quiz-previa" />
      </main>
    );
  }
  return <Quiz eu={eu} />;
}

