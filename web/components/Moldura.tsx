"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import type { Colecao, Eu } from "@/lib/tipos";
import { BuscaK } from "./BuscaK";
import { Provedor } from "./Contexto";
import { Icone } from "./Icone";
import { IconeMenu } from "./IconesMenu";
import { IconePasta, IconeSidebar } from "./IconesSidebar";
import { Logo } from "./Logo";
import { estiloTema } from "@/lib/identidade";
import { AvatarUsuario } from "./AvatarUsuario";
import { CardPremium } from "./CardPremium";
import { ModalPlanos } from "./ModalPlanos";

const ABAS = [
  { href: "/inicio", nome: "Início", icone: "inicio" },
  { href: "/pesquisa", nome: "Pesquisa", icone: "pesquisa" },
  { href: "/ideias", nome: "Ideias", icone: "ideias" },
  { href: "/garimpo", nome: "Garimpo", icone: "garimpo" },
  { href: "/salvos", nome: "Salvos", icone: "salvos" },
  { href: "/estudio", nome: "Estúdio", icone: "estudio" },
] as const;

// cor da pasta de cada coleção, na ordem em que aparecem
const CORES_PASTA = ["#e07b39", "#4caf6a", "#4a8fe0", "#a066d8", "#e0b930"];

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
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [planosAberto, setPlanosAberto] = useState(false);
  // outras telas (Configurações → Plano e uso) abrem os planos com window.dispatchEvent(new Event("abrir-planos"))
  useEffect(() => {
    const abrir = () => setPlanosAberto(true);
    window.addEventListener("abrir-planos", abrir);
    return () => window.removeEventListener("abrir-planos", abrir);
  }, []);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pesquisaAberta, setPesquisaAberta] = useState(true);
  const { dados: colecoes } = useApi<Colecao[]>(eu ? "/api/colecoes" : null, { atualizarAoInvalidar: true });
  const totalSalvos = (colecoes ?? []).reduce((soma, c) => soma + c.itens, 0);

  useEffect(() => {
    if (eu && !eu.espaco.boas_vindas_ok) {
      router.replace(`/boas-vindas?proximo=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [eu, router]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const campo = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (!campo && (e.metaKey || e.ctrlKey) && ["m", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        router.push(e.key.toLowerCase() === "m" ? "/inicio" : "/config");
        setSidebarAberta(false);
      }
      if (e.key === "Escape") { setSidebarAberta(false); setMenu(false); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((a) => !a);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [router]);

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
    location.href = "/entrar";
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

  // um item da sidebar: na página aberta, o ícone ganha um quadradinho branco
  const item = (href: string, icone: string, nome: string, extra?: React.ReactNode) => (
    <Link href={href} className="sidebar-item" aria-current={ativa(pathname, href) ? "page" : undefined} onClick={() => setSidebarAberta(false)}>
      <span className="sidebar-icone"><IconeSidebar nome={icone} /></span><span className="sidebar-nome">{nome}</span>{extra}
    </Link>
  );

  return (
    <Provedor eu={eu} pronto={pronto} recarregarEu={recarregar}>
      <div className="app-moldura" style={{ ...estiloTema(eu?.conta.cor_perfil, eu?.conta.cor_personagem), "--topo": "0px" } as React.CSSProperties}>
      <button className="sidebar-abrir" onClick={() => setSidebarAberta(true)} aria-label="Abrir menu" aria-expanded={sidebarAberta} aria-controls="sidebar">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {sidebarAberta && <button className="sidebar-fundo" aria-label="Fechar menu" onClick={() => setSidebarAberta(false)} />}
      <aside id="sidebar" className={`sidebar${sidebarAberta ? " aberta" : ""}`} aria-label="Menu principal">
        <div className="sidebar-marca">
          <Link href="/inicio" onClick={() => setSidebarAberta(false)} aria-label="Cleo, ir para o início"><Logo tamanho={30} triangulo /></Link>
          <button className="sidebar-fechar icone-bt" onClick={() => setSidebarAberta(false)} aria-label="Fechar menu"><Icone nome="x" /></button>
        </div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          <div className="sidebar-grupo">
            {item("/inicio", "inicio", "Início")}
            <div className="sidebar-pai">
              {item("/pesquisa", "busca", "Pesquisa")}
              <button type="button" className="sidebar-seta" aria-expanded={pesquisaAberta} aria-controls="sidebar-filhos-pesquisa"
                aria-label={pesquisaAberta ? "Esconder Garimpo e Ideias" : "Mostrar Garimpo e Ideias"} onClick={() => setPesquisaAberta((a) => !a)}>
                <Icone nome="baixo" tamanho={14} traco={2} />
              </button>
              {pesquisaAberta && (
                <div className="sidebar-filhos" id="sidebar-filhos-pesquisa">
                  {ABAS.slice(2, 4).map((a) => (
                    <Link key={a.href} href={a.href} className="sidebar-filho" aria-current={ativa(pathname, a.href) ? "page" : undefined} onClick={() => setSidebarAberta(false)}>
                      {a.nome}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {item("/salvos", "salvos", "Salvos", totalSalvos > 0 ? <span className="sidebar-contador">{totalSalvos}</span> : null)}
            {item("/estudio", "estudio", "Estúdio")}
            {item("/config", "ajustes", "Configurações")}
            {eu?.admin && item("/admin", "ajustes", "Administração")}
          </div>
          {eu && (
            <div className="sidebar-grupo">
              <p className="sidebar-titulo">Coleções</p>
              {(colecoes ?? []).map((c, i) => (
                <Link key={c.id} href={`/salvos/${c.id}`} className="sidebar-item" aria-current={pathname === `/salvos/${c.id}` ? "page" : undefined} onClick={() => setSidebarAberta(false)}>
                  <span className="sidebar-icone"><IconePasta cor={CORES_PASTA[i % CORES_PASTA.length]} /></span><span className="sidebar-nome">{c.nome}</span>
                </Link>
              ))}
              <Link href="/salvos" className="sidebar-item" onClick={() => setSidebarAberta(false)}>
                <span className="sidebar-icone"><IconeSidebar nome="nova-pasta" /></span><span className="sidebar-nome">Nova coleção</span>
              </Link>
            </div>
          )}
        </nav>
        <div className="sidebar-rodape">
          {eu && <CardPremium assinante={eu.plano.id !== "gratis"} aoAbrir={() => {setSidebarAberta(false);setPlanosAberto(true);}}/>}
          <button className="sidebar-item" title={eu ? "Nenhum aviso por enquanto" : "Entre para ver os avisos"} onClick={visitante ? irEntrar : undefined}><span className="sidebar-icone"><IconeSidebar nome="avisos" /></span><span className="sidebar-nome">Avisos</span></button>
          <div className="sidebar-conta">
            {visitante && (
              <Link href={`/entrar?modo=criar&proximo=${encodeURIComponent(pathname)}`} className="bt1 bt-p bt-criar">
                Criar conta
              </Link>
            )}
            {eu && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button className="sidebar-perfil" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menu do perfil">
                {eu.conta.avatar ? <AvatarUsuario avatar={eu.conta.avatar} cor={eu.conta.cor_perfil} corPersonagem={eu.conta.cor_personagem} tamanho={36}/> : <span className="avatar">{iniciais}</span>}<span className="sidebar-pessoa">{nomePessoa}</span><Icone nome="baixo" />
              </button>
              {menu && eu && (
                <div className="mp" role="menu" aria-label="Menu do perfil">
                  <div className="mp-quem">
                    {eu.conta.avatar ? <AvatarUsuario avatar={eu.conta.avatar} cor={eu.conta.cor_perfil} corPersonagem={eu.conta.cor_personagem} tamanho={42}/> : <span className="mp-avatar">{iniciais}<i aria-hidden="true" /></span>}
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
                        <Link className="mp-item" role="menuitem" href="/config" onClick={() => setMenu(false)} style={{ "--i": 6 } as React.CSSProperties}>
                          <IconeMenu nome="ajustes" tamanho={15} /> Configurações
                        </Link>
                        <Link className="mp-item" role="menuitem" href="/config#plano" onClick={() => setMenu(false)} style={{ "--i": 7 } as React.CSSProperties}>
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
      </aside>
      <div className="app-conteudo"><main className="pagina" key={pathname}>{children}</main></div>
      {planosAberto && eu && <ModalPlanos planoAtual={eu.plano.id} fechar={() => setPlanosAberto(false)}/>}
      </div>
      {buscaAberta && <BuscaK fechar={() => setBuscaAberta(false)} />}
    </Provedor>
  );
}
