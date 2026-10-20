"use client";

import { useEffect, useState } from "react";

/** "https://www.exemplo.com.br/x" -> "exemplo.com.br" (para mostrar e para buscar a logo). */
export function dominio(link: string) {
  const l = link.trim();
  if (!l) return "";
  try {
    return new URL(/^https?:\/\//i.test(l) ? l : `https://${l}`).hostname.replace(/^www\./, "");
  } catch {
    return l;
  }
}

/** O valor só depois de `ms` sem mudar (para não buscar a cada letra digitada). */
function useAtrasado<T>(valor: T, ms: number) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/** A logo do site do negócio (buscada pela API); enquanto carrega, ou se o site não tem logo, fica a inicial. */
export function LogoSite({ site, letra, className = "" }: { site: string; letra: string; className?: string }) {
  const dominio = useAtrasado(site, 600);
  const [estado, setEstado] = useState<{ dominio: string; ok: boolean } | null>(null);
  const daqui = estado?.dominio === dominio ? estado : null;
  return (
    <span className={`perfil-produto-letra${daqui?.ok ? " com-logo" : ""} ${className}`}>
      {letra}
      {dominio && daqui?.ok !== false && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={dominio} src={`/api/logo?site=${encodeURIComponent(dominio)}&v=2`} alt=""
          onLoad={() => setEstado({ dominio, ok: true })} onError={() => setEstado({ dominio, ok: false })} />
      )}
    </span>
  );
}
