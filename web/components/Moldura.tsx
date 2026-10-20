"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import type { Eu } from "@/lib/tipos";
import { BuscaK } from "./BuscaK";
import { Provedor } from "./Contexto";
import { Icone } from "./Icone";
import { IconeMenu } from "./IconesMenu";
import { Logo } from "./Logo";

const ABAS = [
  { href: "/inicio", nome: "Início", icone: "inicio" },
  { href: "/ideias", nome: "Ideias", icone: "ideias" },
  { href: "/garimpo", nome: "Garimpo", icone: "garimpo" },
  { href: "/salvos", nome: "Salvos", icone: "salvos" },
  { href: "/estudio", nome: "Estúdio", icone: "estudio" },
] as const;

/** Sem sessão do Supabase no navegador nem pergunta à API (evita 401 para visitantes). */
async function carregarEu(): Promise<Eu | null> {
  const { data } = await supabaseNavegador().auth.getSession();
  if (!data.session) return null;
  return api<Eu>("/api/eu", { silencioso: true });
}

/** Quem está logado. Sem login (visitante no Início), devolve eu = null sem mandar para /entrar. */
function useEu() {
  const [estado, setEstado] = useState<{ eu: Eu | null; pronto: boolean }>({ eu: null, pronto: false });
  const recarregar = useCallback(async () => {
    try {
      const eu = await carregarEu();
      setEstado({ eu, pronto: true });
    } catch {
      setEstado({ eu: null, pronto: true });
    }
  }, []);
  useEffect(() => {
    let vivo = true;
    carregarEu()
      .then((eu) => vivo && setEstado({ eu, pronto: true }))
      .catch(() => vivo && setEstado({ eu: null, pronto: true }));
    return () => {
      vivo = false;
    };
  }, []);
  return { ...estado, recarregar };
}

function ativa(pathname: string, href: string) {
  if (href === "/ideias") return pathname.startsWith("/ideia");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Moldura({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { eu, pronto, recarregar } = useEu();
  const visitante = pronto && !eu;
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const ver = () => setRolou(window.scrollY > 8);
    ver();
    window.addEventListener("scroll", ver, { passive: true });
    return () => window.removeEventListener("scroll", ver);
  }, []);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eu && !eu.espaco.boas_vindas_ok) {
      router.replace(`/boas-vindas?proximo=${encodeURIComponent(location.pathname + location.search)}`);
    }
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


  async function sair() {
    await supabaseNavegador().auth.signOut();
    location.href = "/inicio";
  }

  // visitante: busca, sino e perfil levam para a entrada, e depois voltam para esta página
  const irEntrar = useCallback(() => {
    router.push(`/entrar?proximo=${encodeURIComponent(location.pathname + location.search)}`);
  }, [router]);
  const abrirBusca = useCallback(() => (eu ? setBuscaAberta(true) : irEntrar()), [eu, irEntrar]);

  // a pessoa (o nome dela; sem nome, o do espaço)
  const nomePessoa = eu?.conta.nome && !eu.conta.nome.includes("@") ? eu.conta.nome : eu?.espaco.nome ?? "";
  const partesNome = nomePessoa.trim().split(/\s+/).filter(Boolean);
  const iniciais = ((partesNome[0]?.[0] ?? "") + (partesNome.length > 1 ? partesNome[partesNome.length - 1][0] : "")).toUpperCase() || "·";

  return (
    <Provedor eu={eu} pronto={pronto} recarregarEu={recarregar}>
      <header className={`topo${rolou ? " rolou" : ""}`}>
        <div className="topo-linha">
          <div className="topo-esq">
            <Link href="/inicio" aria-label="mecha, ir para o início">
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
          <button className="busca-pilula" onClick={abrirBusca}>
            <Icone nome="busca" />
            <span>Buscar ideia, SaaS ou nicho</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="topo-dir">
            <button className="icone-bt so-celular" onClick={abrirBusca} aria-label="Buscar">
              <Icone nome="busca" />
            </button>
            <button className="icone-bt" aria-label="Avisos" title={eu ? "Nenhum aviso por enquanto" : "Entre para ver os avisos"} onClick={visitante ? irEntrar : undefined}>
              <Icone nome="sino" />
            </button>
            {visitante && (
              <Link href={`/entrar?modo=criar&proximo=${encodeURIComponent(pathname)}`} className="bt1 bt-p bt-criar">
                Criar conta
              </Link>
            )}
            {eu && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menu do perfil">
                {iniciais}
              </button>
              {menu && eu && (
                <div className="mp" role="menu" aria-label="Menu do perfil">
                  <div className="mp-quem">
                    <span className="mp-avatar">{iniciais}<i aria-hidden="true" /></span>
                    <span className="mp-nome">
                      <b>{nomePessoa}</b>
                      <span>{eu.conta.email}</span>
                    </span>
                    {eu.plano.id === "gratis"
                      ? <span className="mp-plano">Grátis</span>
                      : <span className="mp-plano pro"><Icone nome="raio" tamanho={10} /> {eu.plano.nome.toUpperCase()}</span>}
                  </div>
                  <div className="mp-caixa">
                    <div className="mp-corpo">
                      <div className="mp-grupo">
                        {ABAS.map((a, i) => (
                          <Link key={a.href} className="mp-item" role="menuitem" href={a.href} onClick={() => setMenu(false)}
                            aria-current={ativa(pathname, a.href) ? "page" : undefined} style={{ "--i": i } as React.CSSProperties}>
                            <IconeMenu nome={a.icone} tamanho={15} /> {a.nome}
                          </Link>
                        ))}
                      </div>
                      <div className="mp-grupo">
                        <Link className="mp-item" role="menuitem" href="/config" onClick={() => setMenu(false)} style={{ "--i": 5 } as React.CSSProperties}>
                          <IconeMenu nome="ajustes" tamanho={15} /> Configurações
                        </Link>
                        <Link className="mp-item" role="menuitem" href="/config#plano" onClick={() => setMenu(false)} style={{ "--i": 6 } as React.CSSProperties}>
                          <IconeMenu nome="plano" tamanho={15} /> Plano e uso
                          <span className="mp-dica">{eu.uso.garimpos}/{eu.plano.garimpos} garimpos</span>
                        </Link>
                      </div>
                    </div>
                    <div className="mp-rodape">
                      <button className="mp-buscar" onClick={() => { setMenu(false); abrirBusca(); }}>Buscar <kbd>⌘K</kbd></button>
                      <button className="mp-sair" role="menuitem" onClick={sair}>Sair</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
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
      <main className="pagina" key={pathname}>{children}</main>
      {buscaAberta && <BuscaK fechar={() => setBuscaAberta(false)} />}
    </Provedor>
  );
}
