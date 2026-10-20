"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, limparCache, useApi } from "@/lib/api";
import { capaUrl, num } from "@/lib/fmt";
import type { Eu, Video } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { IconeQuiz, type NomeIconeQuiz } from "@/components/IconesQuiz";
import { Logo } from "@/components/Logo";
import { MascoteAtor } from "@/components/MascoteAtor";
import { dominio, LogoSite } from "@/components/LogoSite";
import { TIPOS_NEGOCIO as TIPOS, type TipoNegocio } from "@/lib/perfil";

type Nicho = { id: string; rotulo: string };
type Perfil = "founder" | "empresario" | "investidor" | "passeando";
type Objetivo = "ideias" | "criativos" | "os_dois";
type Passo = "nome" | "perfil" | "objetivo" | "saas" | "nichos";
type Opcao<T> = { id: T; icone: NomeIconeQuiz; t: string; d: string; curto: string };

const PERFIS: Opcao<Perfil>[] = [
  { id: "founder", icone: "founder", t: "Founder", d: "Estou criando ou quero criar um negócio online", curto: "Founder" },
  { id: "empresario", icone: "empresario", t: "Empresário", d: "Tenho um negócio e quero vender mais", curto: "Empresário" },
  { id: "investidor", icone: "investidor", t: "Investidor", d: "Procuro tendências e oportunidades", curto: "Investidor" },
  { id: "passeando", icone: "passeando", t: "Só estou dando uma olhada", d: "Quero ver o que está bombando", curto: "Explorando" },
];
const OBJETIVOS: Opcao<Objetivo>[] = [
  { id: "ideias", icone: "ideias", t: "Ideias de negócio", d: "SaaS, app, loja ou produto digital: o que criar, pelo que está em alta", curto: "Ideias de negócio" },
  { id: "criativos", icone: "criativos", t: "Criativos", d: "Vídeos que viralizam, para copiar o formato e divulgar", curto: "Criativos" },
  { id: "os_dois", icone: "os_dois", t: "Os dois", d: "Quero ideias e criativos", curto: "Ideias e criativos" },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  return ((partes[0][0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function Quiz({ eu }: { eu: Eu }) {
  const sp = useSearchParams();
  const proximo = sp.get("proximo");
  const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/inicio";
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const { dados: emAlta } = useApi<{ itens: Video[] }>("/api/publico/em-alta?limite=90");

  const [passo, setPasso] = useState<Passo>("nome");
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");
  // o nome padrão da conta é a primeira parte do e-mail: isso não é um nome, então o campo começa vazio
  const parteEmail = eu.conta.email.split("@")[0];
  const [nome, setNome] = useState(eu.conta.nome && !eu.conta.nome.includes("@") && eu.conta.nome !== parteEmail ? eu.conta.nome : "");
  const [digitando, setDigitando] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(eu.espaco.perfil);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(eu.espaco.objetivo);
  const [temSaas, setTemSaas] = useState<boolean | null>(eu.meu_saas ? true : null);
  const [saas, setSaas] = useState({ tipo: eu.meu_saas?.tipo ?? null, nome: eu.meu_saas?.nome ?? "", link: eu.meu_saas?.link ?? "", o_que_faz: eu.meu_saas?.o_que_faz ?? "" });
  const [escolhidos, setEscolhidos] = useState<string[]>(eu.espaco.nichos);
  const [verIngles, setVerIngles] = useState(eu.espaco.ver_ingles);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comemora, setComemora] = useState(0);

  const perguntaSaas = perfil === "founder" || perfil === "empresario";
  const passos: Passo[] = ["nome", "perfil", "objetivo", ...(perguntaSaas ? (["saas"] as Passo[]) : []), "nichos"];
  const indice = passos.indexOf(passo);

  function irPara(p: Passo, lista: Passo[] = passos) {
    setComemora((c) => c + 1);
    setErro(null);
    setDirecao(lista.indexOf(p) < lista.indexOf(passo) ? "tras" : "frente");
    setPasso(p);
  }
  function avancar() {
    if (indice < passos.length - 1) irPara(passos[indice + 1]);
  }
  function voltar() {
    if (indice <= 0) return;
    setErro(null);
    setDirecao("tras");
    setPasso(passos[indice - 1]);
  }

  function escolherPerfil(p: Perfil) {
    setPerfil(p);
    if (p !== "founder" && p !== "empresario") setTemSaas(null);
    setTimeout(() => irPara("objetivo"), 260);
  }
  function escolherObjetivo(o: Objetivo) {
    setObjetivo(o);
    setTimeout(() => irPara(perguntaSaas ? "saas" : "nichos"), 260);
  }

  // atalhos: 1, 2, 3… escolhem a opção nas perguntas de múltipla escolha
  useEffect(() => {
    if (passo !== "perfil" && passo !== "objetivo") return;
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      if (passo === "perfil" && PERFIS[n - 1]) escolherPerfil(PERFIS[n - 1].id);
      if (passo === "objetivo" && OBJETIVOS[n - 1]) escolherObjetivo(OBJETIVOS[n - 1].id);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const saasOk = temSaas === false || (temSaas === true && saas.nome.trim().length > 0);

  async function concluir() {
    setSalvando(true);
    setErro(null);
    const primeiroNome = nome.trim().split(/\s+/)[0];
    const nomeEspaco = temSaas && saas.nome.trim() ? saas.nome.trim() : primeiroNome ? `Espaço de ${primeiroNome}` : undefined;
    try {
      if (temSaas && saas.nome.trim()) {
        await api("/api/meu-saas", { method: "PUT", json: { nome: saas.nome, tipo: saas.tipo, link: saas.link || null, o_que_faz: saas.o_que_faz || null } });
      }
      await api("/api/espaco", {
        method: "PATCH",
        json: {
          meu_nome: nome.trim() || undefined,
          nome: nomeEspaco,
          perfil: perfil ?? undefined,
          objetivo: objetivo ?? undefined,
          nichos: escolhidos,
          idioma: "pt",
          ver_ingles: verIngles,
          boas_vindas_ok: true,
        },
      });
      limparCache("/api/eu");
      location.href = destino;
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  const alternarNicho = (id: string) => setEscolhidos((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const listaNichos = (nichos ?? []).filter((n) => n.id !== "outro");
  const primeiro = nome.trim().split(/\s+/)[0];
  const campo = { onFocus: () => setDigitando(true), onBlur: () => setDigitando(false) };

  return (
    <main className="quiz-pagina">
      <div className="quiz-lado">
        <header className="quiz-topo">
          <Logo tamanho={18} />
        </header>

        <div className="quiz-esq">
          <div className="quiz-ator"><MascoteAtor tamanho={56} comemora={comemora} modo={digitando ? "lendo" : "normal"} /></div>

          <section className={`quiz-passo quiz-${direcao}`} key={passo}>
            {passo === "nome" && (
              <form onSubmit={(e) => { e.preventDefault(); avancar(); }}>
                <p className="quiz-rotulo">Boas-vindas à mecha</p>
                <h1>Oi! Como podemos te chamar?</h1>
                <p className="suave">Leva 30 segundos. Assim a mecha mostra o que faz sentido para você.</p>
                <div className="quiz-campo-icone">
                  <Icone nome="usuario" tamanho={18} />
                  <input className="campo campo-g" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" maxLength={60} autoFocus {...campo}
                    aria-label="Seu nome" autoComplete="given-name" />
                </div>
                <div className="quiz-acoes">
                  <button type="button" className="bt3" onClick={() => avancar()}>Pular</button>
                  <button className="bt1 bt-g" disabled={!nome.trim()}>Continuar <Icone nome="direita" tamanho={16} /></button>
                </div>
              </form>
            )}

            {passo === "perfil" && (
              <>
                <p className="quiz-rotulo">Sobre você</p>
                <h1>{primeiro ? `Prazer, ${primeiro}!` : "Prazer!"} Quem é você?</h1>
                <Opcoes opcoes={PERFIS} valor={perfil} escolher={escolherPerfil} />
              </>
            )}

            {passo === "objetivo" && (
              <>
                <p className="quiz-rotulo">Seu objetivo</p>
                <h1>O que você procura?</h1>
                <Opcoes opcoes={OBJETIVOS} valor={objetivo} escolher={escolherObjetivo} />
              </>
            )}

            {passo === "saas" && (
              <form onSubmit={(e) => { e.preventDefault(); if (saasOk) avancar(); }}>
                <p className="quiz-rotulo">Seu negócio</p>
                <h1>Você já tem um negócio online?</h1>
                <div className="quiz-opcoes quiz-opcoes-lado">
                  <button type="button" className="quiz-opcao" aria-pressed={temSaas === true} onClick={() => setTemSaas(true)} style={{ "--i": 0 } as React.CSSProperties}>
                    <span className="quiz-icone" aria-hidden="true"><IconeQuiz nome="saas_sim" /></span>
                    <span><b>Sim, tenho</b><span>Conte um pouco dele</span></span>
                    <Marcador ativo={temSaas === true} />
                  </button>
                  <button type="button" className="quiz-opcao" aria-pressed={temSaas === false} style={{ "--i": 1 } as React.CSSProperties}
                    onClick={() => { setTemSaas(false); setTimeout(() => irPara("nichos"), 260); }}>
                    <span className="quiz-icone" aria-hidden="true"><IconeQuiz nome="saas_nao" /></span>
                    <span><b>Ainda não</b><span>Estou procurando a ideia</span></span>
                    <Marcador ativo={temSaas === false} />
                  </button>
                </div>
                {temSaas && (
                  <div className="quiz-campos">
                    <div className="chips quiz-tipos" role="group" aria-label="Tipo de negócio">
                      {TIPOS.map((t, i) => (
                        <button key={t.id} type="button" className="chip" aria-pressed={saas.tipo === t.id} style={{ "--i": i } as React.CSSProperties}
                          onClick={() => setSaas({ ...saas, tipo: saas.tipo === t.id ? null : t.id })}>
                          {saas.tipo === t.id && <Icone nome="check" tamanho={13} traco={2.4} />}
                          {t.t}
                        </button>
                      ))}
                    </div>
                    <input className="campo campo-g" value={saas.nome} onChange={(e) => setSaas({ ...saas, nome: e.target.value })} placeholder="Nome do seu negócio" maxLength={80} autoFocus {...campo} aria-label="Nome do seu negócio" />
                    <input className="campo campo-g" value={saas.link} onChange={(e) => setSaas({ ...saas, link: e.target.value })} placeholder="Site, loja ou link (opcional)" maxLength={300} {...campo} inputMode="url" aria-label="Site, loja ou link do seu negócio" />
                    <input className="campo campo-g" value={saas.o_que_faz} onChange={(e) => setSaas({ ...saas, o_que_faz: e.target.value })} placeholder="O que ele faz, em uma frase (opcional)" maxLength={300} {...campo} aria-label="O que o seu negócio faz" />
                  </div>
                )}
                <div className="quiz-acoes">
                  <button type="button" className="bt3" onClick={voltar}><Icone nome="voltar" tamanho={15} /> Voltar</button>
                  <button className="bt1 bt-g" disabled={!saasOk}>Continuar <Icone nome="direita" tamanho={16} /></button>
                </div>
              </form>
            )}

            {passo === "nichos" && (
              <>
                <p className="quiz-rotulo">Seus assuntos</p>
                <h1>Quais assuntos te interessam?</h1>
                <p className="suave">Escolha quantos quiser. Dá para mudar depois.</p>
                <div className="chips quiz-chips">
                  {listaNichos.map((n, i) => (
                    <button key={n.id} className="chip" aria-pressed={escolhidos.includes(n.id)} onClick={() => alternarNicho(n.id)} style={{ "--i": i } as React.CSSProperties}>
                      {escolhidos.includes(n.id) && <Icone nome="check" tamanho={13} traco={2.4} />}
                      {n.rotulo}
                    </button>
                  ))}
                </div>
                <button className="quiz-opcao quiz-toggle" aria-pressed={verIngles} onClick={() => setVerIngles((v) => !v)}>
                  <span className="quiz-icone" aria-hidden="true"><IconeQuiz nome="globo" /></span>
                  <span><b>Ver também o que bomba lá fora</b><span>Ideias em inglês que ainda não têm versão no Brasil</span></span>
                  <span className="quiz-chave" aria-hidden="true"><i /></span>
                </button>
                <div className="quiz-acoes">
                  <button type="button" className="bt3" onClick={voltar}><Icone nome="voltar" tamanho={15} /> Voltar</button>
                  <button className="bt1 bt-g" onClick={concluir} disabled={salvando}>
                    {salvando ? <><span className="girando" aria-hidden="true" /> Preparando…</> : <>Começar a usar <Icone nome="direita" tamanho={16} /></>}
                  </button>
                </div>
              </>
            )}
          </section>

          {(passo === "perfil" || passo === "objetivo") && (
            <div className="quiz-rodape">
              <button className="link-sutil" onClick={voltar}><Icone nome="voltar" tamanho={14} /> Voltar</button>
              <span className="quiz-dica">Dica: aperte <kbd>1</kbd>–<kbd>{passo === "perfil" ? PERFIS.length : OBJETIVOS.length}</kbd> para escolher</span>
            </div>
          )}
          {erro && <p className="erro-caixa" role="alert">{erro}</p>}
        </div>
      </div>

      <Previa
        passo={passo}
        nome={nome}
        email={eu.conta.email}
        perfil={perfil}
        objetivo={objetivo}
        mostraSaas={perguntaSaas}
        temSaas={temSaas}
        saas={saas}
        escolhidos={escolhidos}
        nichos={listaNichos}
        verIngles={verIngles}
        videos={emAlta?.itens ?? []}
      />
    </main>
  );
}

function Marcador({ ativo, tecla }: { ativo: boolean; tecla?: number }) {
  return (
    <span className={`quiz-marcador${ativo ? " ativo" : ""}`} aria-hidden="true">
      {ativo ? <Icone nome="check" tamanho={14} traco={2.6} /> : tecla ? <kbd>{tecla}</kbd> : null}
    </span>
  );
}

function Opcoes<T extends string>({ opcoes, valor, escolher }: { opcoes: Opcao<T>[]; valor: T | null; escolher: (v: T) => void }) {
  return (
    <div className="quiz-opcoes">
      {opcoes.map((o, i) => (
        <button key={o.id} className="quiz-opcao" aria-pressed={valor === o.id} onClick={() => escolher(o.id)} style={{ "--i": i } as React.CSSProperties}>
          <span className="quiz-icone" aria-hidden="true"><IconeQuiz nome={o.icone} /></span>
          <span><b>{o.t}</b><span>{o.d}</span></span>
          <Marcador ativo={valor === o.id} tecla={i + 1} />
        </button>
      ))}
    </div>
  );
}

const FRASE_PERFIL: Record<Perfil, string> = {
  founder: "Founder construindo um negócio online",
  empresario: "Empresário de olho em vender mais",
  investidor: "Investidor atrás de tendências",
  passeando: "Explorando o que está em alta",
};
const ACAO_OBJETIVO: Record<Objetivo, string> = { ideias: "Ver ideias", criativos: "Ver criativos", os_dois: "Ver tudo" };

/** Texto que troca deslizando de baixo para cima quando `k` muda. */
function Troca({ k, children, className = "" }: { k: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`troca ${className}`}>
      <span key={k} className="troca-in">{children}</span>
    </span>
  );
}

/** O perfil ao vivo, na metade direita, direto no fundo: se monta conforme a pessoa responde. */
function Previa(p: {
  passo: Passo;
  nome: string;
  email: string;
  perfil: Perfil | null;
  objetivo: Objetivo | null;
  mostraSaas: boolean;
  temSaas: boolean | null;
  saas: { tipo: TipoNegocio | null; nome: string; link: string; o_que_faz: string };
  escolhidos: string[];
  nichos: Nicho[];
  verIngles: boolean;
  videos: Video[];
}) {
  const perfil = PERFIS.find((x) => x.id === p.perfil);
  const objetivo = OBJETIVOS.find((x) => x.id === p.objetivo);
  const rotulos = p.escolhidos.map((id) => p.nichos.find((n) => n.id === id)).filter((n): n is Nicho => !!n);
  const nome = p.nome.trim();
  const ini = iniciais(nome);


  // capas dos vídeos em alta dos assuntos escolhidos (ou os mais em alta, se ainda não escolheu)
  const comCapa = p.videos.filter((v) => v.capa);
  const doNicho = p.escolhidos.length ? comCapa.filter((v) => v.nichos.some((n) => p.escolhidos.includes(n))) : [];
  const amostra = (doNicho.length >= 4 ? doNicho : [...doNicho, ...comCapa.filter((v) => !doNicho.includes(v))]).slice(0, 4);

  const ativo = (k: Passo) => (p.passo === k ? " ativo" : "");
  const site = dominio(p.saas.link);
  const tipoRotulo = p.temSaas ? TIPOS.find((t) => t.id === p.saas.tipo)?.t : undefined;

  return (
    <aside className="quiz-previa" aria-label="Prévia do seu perfil">
      <div className="previa-coluna">
        <article className="perfil">
          {/* capa ainda sem foto: um espaço esperando a pessoa personalizar */}
          <div className="perfil-capa" aria-hidden="true">
            <i className="perfil-luz" />
            <i className="perfil-luz b" />
            <span className="perfil-capa-dica"><b>+</b> Adicionar capa</span>
          </div>

          <div className={`perfil-avatar${ini ? " tem" : ""}${ativo("nome")}`}>
            {ini ? <Troca k={ini}>{ini}</Troca> : (
              <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="25" r="11" /><path d="M10 64c2-14 11-22 22-22s20 8 22 22z" /></svg>
            )}
          </div>

          <div className="perfil-topo">
            <div className="perfil-quem">
              <strong className={`${nome ? "" : "sem"}${ativo("nome")}`}>
                {nome || "Seu nome"}
                {p.passo === "nome" && <i className="perfil-cursor" aria-hidden="true" />}
              </strong>
              <span>{perfil ? <Troca k={perfil.id}>{FRASE_PERFIL[perfil.id]}</Troca> : p.email}</span>
            </div>
            <span className={`perfil-pilula${ativo("nichos")}`}>
              {rotulos.length > 0 && (
                <span className="perfil-bolinhas" aria-hidden="true">
                  {rotulos.slice(0, 3).map((n) => <i key={n.id}>{n.rotulo[0]}</i>)}
                </span>
              )}
              <Troca k={String(rotulos.length)}>{rotulos.length === 0 ? "Assuntos" : rotulos.length === 1 ? rotulos[0].rotulo : `${rotulos.length} assuntos`}</Troca>
            </span>
          </div>

          <div className="perfil-rodape">
            <dl className="perfil-numeros">
              <div className={ativo("perfil")}>
                <dd>{perfil ? <Troca k={perfil.id}>{perfil.curto}</Troca> : "—"}</dd>
                <dt>perfil</dt>
              </div>
              <div className={ativo("objetivo")}>
                <dd>{objetivo ? <Troca k={objetivo.id}>{objetivo.id === "os_dois" ? "Os dois" : objetivo.id === "ideias" ? "Ideias" : "Criativos"}</Troca> : "—"}</dd>
                <dt>procura</dt>
              </div>
              <div className={p.passo === "nichos" ? " ativo" : ""}>
                <dd><Troca k={String(p.verIngles)}>{p.verIngles ? "BR + fora" : "Brasil"}</Troca></dd>
                <dt>alcance</dt>
              </div>
            </dl>
            <span className={`perfil-botao${objetivo ? " pronto" : ""}`} aria-hidden="true">
              <Troca k={objetivo?.id ?? "x"}>{objetivo ? ACAO_OBJETIVO[objetivo.id] : "Começar"}</Troca>
            </span>
          </div>

          {p.mostraSaas && (
            <div className={`perfil-produto${ativo("saas")}`}>
              <LogoSite site={p.temSaas ? site : ""} letra={p.temSaas && p.saas.nome.trim() ? p.saas.nome.trim()[0].toUpperCase() : "·"} />
              <div>
                <b>
                  {p.temSaas === false ? "Procurando a próxima ideia" : p.temSaas && p.saas.nome.trim() ? p.saas.nome.trim() : <span className="sem">Seu negócio</span>}
                  {(site || tipoRotulo) && <span className="perfil-site">{[tipoRotulo, site].filter(Boolean).join(" · ")}</span>}
                </b>
                <span>{p.temSaas === false ? "A mecha vai sugerir o que criar" : p.saas.o_que_faz.trim() || "O que ele faz aparece aqui"}</span>
              </div>
            </div>
          )}
        </article>

        <div className="previa-feed">
          <span className="previa-feed-titulo">
            Em alta para você
            <Troca k={rotulos.length ? "s" : "g"} className="previa-feed-fonte">{rotulos.length ? "pelos seus assuntos" : "no geral"}</Troca>
          </span>
          <div className="previa-capas">
            {(amostra.length ? amostra : [null, null, null, null]).map((v, i) => v ? (
              <figure key={v.id} className="previa-capa" style={{ "--i": i } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capaUrl(v.capa)!} alt="" loading="lazy" />
                {v.views != null && <figcaption>{num(v.views)}</figcaption>}
              </figure>
            ) : <span key={i} className="previa-capa previa-capa-vazia" />)}
          </div>
        </div>
      </div>
    </aside>
  );
}
