"use client";

import { useCallback, useEffect, useState } from "react";

export class ErroApi extends Error {
  constructor(public status: number, public dados: { mensagem?: string; botao?: string }) {
    super(dados?.mensagem ?? "Algo deu errado. Tente de novo em 1 minuto.");
  }
}

/** Chama a nossa API (mesma origem; o cookie de sessão vai junto, nenhuma chave passa pelo navegador). */
export async function api<T = unknown>(caminho: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...resto } = init ?? {};
  const r = await fetch(caminho, {
    ...resto,
    credentials: "same-origin",
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...resto.headers },
    body: json !== undefined ? JSON.stringify(json) : resto.body,
  });
  if (r.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/entrar")) {
    location.href = "/entrar";
  }
  if (!r.ok) {
    let dados: { mensagem?: string; botao?: string } = {};
    try {
      dados = await r.json();
    } catch {}
    if (r.status >= 500) dados = { mensagem: "O servidor não respondeu. Tente de novo em 1 minuto." };
    throw new ErroApi(r.status, dados);
  }
  return (await r.json()) as T;
}

const cache = new Map<string, unknown>();

type Estado<T> = { caminho: string | null; dados?: T; erro: ErroApi | null; carregando: boolean };

function inicial<T>(caminho: string | null): Estado<T> {
  return {
    caminho,
    dados: caminho ? (cache.get(caminho) as T | undefined) : undefined,
    erro: null,
    carregando: !!caminho && !cache.has(caminho),
  };
}

/** Busca dados com um cache simples por endereço. */
export function useApi<T>(caminho: string | null) {
  const [estado, setEstado] = useState<Estado<T>>(() => inicial<T>(caminho));
  if (estado.caminho !== caminho) setEstado(inicial<T>(caminho));

  const recarregar = useCallback(async () => {
    if (!caminho) return;
    try {
      const d = await api<T>(caminho);
      cache.set(caminho, d);
      setEstado((e) => (e.caminho === caminho ? { ...e, dados: d, erro: null, carregando: false } : e));
    } catch (err) {
      setEstado((e) => (e.caminho === caminho ? { ...e, erro: err as ErroApi, carregando: false } : e));
    }
  }, [caminho]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados: estado.caminho === caminho ? estado.dados : undefined, erro: estado.erro, carregando: estado.carregando, recarregar };
}

export function limparCache(prefixo = "") {
  for (const k of cache.keys()) if (k.startsWith(prefixo)) cache.delete(k);
}
