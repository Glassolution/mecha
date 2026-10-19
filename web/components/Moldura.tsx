"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api";
import type { Eu } from "@/lib/tipos";
import { BuscaK } from "./BuscaK";
import { Provedor } from "./Contexto";
import { Icone } from "./Icone";
import { Logo } from "./Logo";

const ABAS = [
  { href: "/inicio", nome: "Início" },
  { href: "/ideias", nome: "Ideias" },
  { href: "/garimpo", nome: "Garimpo" },
  { href: "/salvos", nome: "Salvos" },
  { href: "/estudio", nome: "Estúdio" },
];

function ativa(pathname: string, href: string) {
  if (href === "/ideias") return pathname.startsWith("/ideia") || pathname.startsWith("/video");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Moldura({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dados: eu, recarregar } = useApi<Eu>("/api/eu");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eu && !eu.espaco.boas_vindas_ok) router.replace("/boas-vindas");
  }, [eu, router]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((a) => !a);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    if (!menu) return;
    function fora(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [menu]);

  const trocarTema = useCallback(() => {
    const atual = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", atual);
    try {
      localStorage.setItem("tema", atual);
    } catch {}
  }, []);

  async function sair() {
    await api("/api/sair", { method: "POST" });
    location.href = "/entrar";
  }

  const iniciais = (eu?.espaco.nome ?? "").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "·";

  return (
    <Provedor eu={eu ?? null} recarregarEu={recarregar}>
      <header className="topo">
        <div className="topo-linha">
          <div className="topo-esq">
            <Link href="/inicio" aria-label="radar, ir para o início">
              <Logo tamanho={24} />
            </Link>
            <nav className="abas" aria-label="Abas">
              {ABAS.map((a) => (
                <Link key={a.href} href={a.href} className="aba" aria-current={ativa(pathname, a.href) ? "page" : undefined}>
                  {a.nome}
                </Link>
              ))}
            </nav>
          </div>
          <button className="busca-pilula" onClick={() => setBuscaAberta(true)}>
            <Icone nome="busca" />
            <span>Buscar ideia, SaaS ou nicho</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="topo-dir">
            <button className="icone-bt so-celular" onClick={() => setBuscaAberta(true)} aria-label="Buscar">
              <Icone nome="busca" />
            </button>
            <button className="icone-bt" onClick={trocarTema} aria-label="Trocar tema claro ou escuro">
              <Icone nome="sol" />
            </button>
            <button className="icone-bt" aria-label="Avisos (nenhum)" title="Nenhum aviso por enquanto">
              <Icone nome="sino" />
            </button>
            {eu && eu.plano.id === "gratis" && (
              <Link href="/config#plano" className="bt1 bt-p bt-pro">
                Assinar o Pro
              </Link>
            )}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menu do perfil">
                {iniciais}
              </button>
              {menu && (
                <div className="menu" role="menu" style={{ right: 0, top: 48 }}>
                  <div style={{ padding: "8px 12px 10px" }}>
                    <b>{eu?.espaco.nome}</b>
                    <div className="fraco" style={{ fontSize: 13 }}>
                      Plano {eu?.plano.nome} · {eu?.uso.garimpos} de {eu?.plano.garimpos} garimpos no mês
                    </div>
                  </div>
                  <Link className="menu-item" role="menuitem" href="/config" onClick={() => setMenu(false)}>
                    <Icone nome="ajustes" /> Configurações
                  </Link>
                  <button className="menu-item" role="menuitem" onClick={sair}>
                    <Icone nome="sair" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="abas-celular" aria-label="Abas">
          {ABAS.map((a) => (
            <Link key={a.href} href={a.href} className="aba" aria-current={ativa(pathname, a.href) ? "page" : undefined}>
              {a.nome}
            </Link>
          ))}
        </nav>
      </header>
      <main className="pagina">{children}</main>
      {buscaAberta && <BuscaK fechar={() => setBuscaAberta(false)} />}
    </Provedor>
  );
}
