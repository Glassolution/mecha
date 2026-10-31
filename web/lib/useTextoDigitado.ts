"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Revelação local da resposta já recebida. Não faz pedidos à IA nem altera o texto salvo. */
export function useTextoDigitado(texto: string, animar: boolean) {
  // Grafemas preservam acentos combinados, emojis e sequências como 👩🏽‍💻.
  const partes = useMemo(() => Array.from(new Intl.Segmenter("pt-BR", {granularity:"grapheme"}).segment(texto), p=>p.segment), [texto]);
  const [deveAnimar] = useState(animar);
  const [visiveis,setVisiveis] = useState(() => !animar || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? partes.length : 0);
  const quadro = useRef<number | null>(null);
  const concluido = useRef(!deveAnimar || visiveis >= partes.length);

  function concluir() {
    concluido.current = true;
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    setVisiveis(partes.length);
  }

  useEffect(() => {
    if (!deveAnimar || concluido.current) return;
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const duracao = Math.min(9000, Math.max(800, partes.length * 7));
    let inicio: number | null = null;
    let ultimo = -Infinity;
    const terminar = () => {
      concluido.current = true;
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
      setVisiveis(partes.length);
    };
    const mudarPreferencia = () => {if (preferencia.matches) terminar();};
    function escrever(agora: number) {
      if (concluido.current) return;
      if (preferencia.matches) {terminar();return;}
      inicio ??= agora;
      const progresso = Math.min(1, (agora-inicio)/duracao);
      if (agora-ultimo >= 24 || progresso === 1) {
        setVisiveis(Math.floor(partes.length * progresso));
        ultimo = agora;
      }
      if (progresso < 1) quadro.current = requestAnimationFrame(escrever);
      else concluido.current = true;
    }
    quadro.current = requestAnimationFrame(escrever);
    preferencia.addEventListener("change",mudarPreferencia);
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
      preferencia.removeEventListener("change",mudarPreferencia);
    };
  }, [deveAnimar,partes]);

  const digitando = visiveis < partes.length;
  return {texto:digitando ? partes.slice(0,visiveis).join("") : texto, digitando, concluir};
}
