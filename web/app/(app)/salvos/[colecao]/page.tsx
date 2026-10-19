"use client";

import { useParams } from "next/navigation";
import { Salvos } from "@/components/Salvos";

export default function PaginaColecao() {
  const { colecao } = useParams<{ colecao: string }>();
  return <Salvos colecaoId={colecao} />;
}
