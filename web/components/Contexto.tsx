"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Eu } from "@/lib/tipos";

type Ctx = {
  eu: Eu | null;
  recarregarEu: () => Promise<void>;
  avisar: (texto: string) => void;
};

const Contexto = createContext<Ctx>({ eu: null, recarregarEu: async () => {}, avisar: () => {} });

export function useApp() {
  return useContext(Contexto);
}

export function Provedor({ eu, recarregarEu, children }: { eu: Eu | null; recarregarEu: () => Promise<void>; children: React.ReactNode }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    if (tempo.current) clearTimeout(tempo.current);
    tempo.current = setTimeout(() => setAviso(null), 2600);
  }, []);
  useEffect(() => () => { if (tempo.current) clearTimeout(tempo.current); }, []);
  return (
    <Contexto.Provider value={{ eu, recarregarEu, avisar }}>
      {children}
      {aviso && (
        <div className="aviso-toast" role="status">
          {aviso}
        </div>
      )}
    </Contexto.Provider>
  );
}
