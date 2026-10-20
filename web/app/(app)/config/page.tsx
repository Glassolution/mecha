"use client";

import { useEffect, useState } from "react";
import { api, limparCache, useApi } from "@/lib/api";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { IconeMenu, type NomeIconeMenu } from "@/components/IconesMenu";
import { dominio, LogoSite } from "@/components/LogoSite";
import { TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/perfil";
import type { Eu } from "@/lib/tipos";

type Nicho = { id: string; rotulo: string };
type Secao = "perfil" | "negocio" | "assuntos" | "plano" | "conta" | "conexoes";

const SECOES: { id: Secao; nome: string; icone: NomeIconeMenu; descricao: string }[] = [
  { id: "perfil", nome: "Perfil", icone: "perfil", descricao: "Como a mecha te chama e o que você procura." },
  { id: "negocio", nome: "Meu negócio", icone: "negocio", descricao: "O seu negócio online. Ajuda a mecha a sugerir criativos e ideias perto do que você faz." },
  { id: "assuntos", nome: "Assuntos", icone: "assuntos", descricao: "Os temas que aparecem primeiro para você e onde a mecha procura." },
  { id: "plano", nome: "Plano e uso", icone: "plano", descricao: "O seu plano e quanto você já usou neste mês." },
  { id: "conta", nome: "Conta", icone: "conta", descricao: "E-mail, senha e saída." },
  { id: "conexoes", nome: "Conexões", icone: "conexoes", descricao: "Ferramentas que se ligam à mecha." },
];

const PERFIS = [
  { id: "founder", t: "Founder" },
  { id: "empresario", t: "Empresário" },
  { id: "investidor", t: "Investidor" },
  { id: "passeando", t: "Explorando" },
] as const;
const OBJETIVOS = [
  { id: "ideias", t: "Ideias de negócio" },
  { id: "criativos", t: "Criativos" },
  { id: "os_dois", t: "Os dois" },
] as const;

type Perfil = (typeof PERFIS)[number]["id"];
type Objetivo = (typeof OBJETIVOS)[number]["id"];
type Form = {
  meuNome: string;
  perfil: Perfil | null;
  objetivo: Objetivo | null;
  interesse: "achar_ideia" | "achar_criativo";
  nichos: string[];
  verIngles: boolean;
  negocio: { tipo: TipoNegocio | null; nome: string; link: string; o_que_faz: string };
};

function doEu(eu: Eu): Form {
  const parteEmail = eu.conta.email.split("@")[0];
  return {
    meuNome: eu.conta.nome && !eu.conta.nome.includes("@") && eu.conta.nome !== parteEmail ? eu.conta.nome : "",
    perfil: eu.espaco.perfil,
    objetivo: eu.espaco.objetivo,
    interesse: eu.espaco.interesse ?? "achar_ideia",
    nichos: eu.espaco.nichos,
    verIngles: eu.espaco.ver_ingles,
    negocio: { tipo: eu.meu_saas?.tipo ?? null, nome: eu.meu_saas?.nome ?? "", link: eu.meu_saas?.link ?? "", o_que_faz: eu.meu_saas?.o_que_faz ?? "" },
  };
}

export default function Configuracoes() {
  const { eu } = useApp();
  if (!eu) return <div className="esqueleto" style={{ height: 480 }} />;
  return <PainelConfig eu={eu} />;
}

function PainelConfig({ eu }: { eu: Eu }) {
  const { recarregarEu, avisar } = useApp();
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [secao, setSecao] = useState<Secao>("perfil");
  const [salvo, setSalvo] = useState<Form>(() => doEu(eu));
  const [form, setForm] = useState<Form>(salvo);
  const [salvando, setSalvando] = useState(false);

  // /config#plano (link do menu do perfil) abre direto a seção
  useEffect(() => {
    const doHash = () => {
      const h = location.hash.slice(1) as Secao;
      if (SECOES.some((s) => s.id === h)) setSecao(h);
    };
    const t = setTimeout(doHash, 0);
    window.addEventListener("hashchange", doHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", doHash);
    };
  }, []);

  const mudou = JSON.stringify(form) !== JSON.stringify(salvo);
  const negocioMudou = JSON.stringify(form.negocio) !== JSON.stringify(salvo.negocio);
  const atual = SECOES.find((s) => s.id === secao)!;
  const muda = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const mudaNegocio = (v: Partial<Form["negocio"]>) => setForm((f) => ({ ...f, negocio: { ...f.negocio, ...v } }));

  async function salvar() {
    setSalvando(true);
    try {
      const nomeNegocio = form.negocio.nome.trim();
      if (negocioMudou && nomeNegocio) {
        await api("/api/meu-saas", { method: "PUT", json: { nome: nomeNegocio, tipo: form.negocio.tipo, link: form.negocio.link || null, o_que_faz: form.negocio.o_que_faz || null } });
      }
      const primeiro = form.meuNome.trim().split(/\s+/)[0];
      await api("/api/espaco", {
        method: "PATCH",
        json: {
          meu_nome: form.meuNome.trim() || undefined,
          nome: nomeNegocio || (primeiro ? `Espaço de ${primeiro}` : undefined),
          perfil: form.perfil ?? undefined,
          objetivo: form.objetivo ?? undefined,
          interesse: form.interesse,
          nichos: form.nichos,
          ver_ingles: form.verIngles,
        },
      });
      limparCache("/api/eu");
      await recarregarEu();
      setSalvo(form);
      avisar("Alterações salvas");
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function irPara(s: Secao) {
    setSecao(s);
    history.replaceState(null, "", `#${s}`);
  }

  return (
    <div className="cfg">
      <aside className="cfg-lado" aria-label="Seções das configurações">
        <div className="cfg-quem">
          <span className="cfg-avatar">{(form.meuNome.trim() || eu.conta.email)[0].toUpperCase()}</span>
          <span><b>{form.meuNome.trim() || "Sua conta"}</b><span>{eu.conta.email}</span></span>
        </div>
        <nav className="cfg-nav">
          {SECOES.slice(0, 5).map((s) => (
            <button key={s.id} className="cfg-nav-item" aria-current={secao === s.id ? "page" : undefined} onClick={() => irPara(s.id)}>
              <IconeMenu nome={s.icone} tamanho={16} /> {s.nome}
            </button>
          ))}
          <span className="cfg-nav-grupo">Mais</span>
          <button className="cfg-nav-item" aria-current={secao === "conexoes" ? "page" : undefined} onClick={() => irPara("conexoes")}>
            <IconeMenu nome="conexoes" tamanho={16} /> Conexões <span className="cfg-em-breve">em breve</span>
          </button>
        </nav>
      </aside>

      <section className="cfg-painel" aria-labelledby="cfg-titulo">
        <header className="cfg-cabeca" key={secao}>
          <span className="cfg-cabeca-icone"><IconeMenu nome={atual.icone} tamanho={18} /></span>
          <span className="cfg-cabeca-traco" aria-hidden="true" />
          <div>
            <h1 id="cfg-titulo">{atual.nome}</h1>
            <p>{atual.descricao}</p>
          </div>
        </header>

        <div className="cfg-linhas" key={`${secao}-linhas`}>
          {secao === "perfil" && (
            <>
              <Linha titulo="Seu nome" dica="Aparece no seu perfil e no menu.">
                <input className="campo" value={form.meuNome} onChange={(e) => muda("meuNome", e.target.value)} placeholder="Seu nome" maxLength={60} aria-label="Seu nome" />
              </Linha>
              <Linha titulo="Quem é você">
                <Escolha opcoes={PERFIS} valor={form.perfil} escolher={(v) => muda("perfil", v)} />
              </Linha>
              <Linha titulo="O que você procura">
                <Escolha opcoes={OBJETIVOS} valor={form.objetivo} escolher={(v) => muda("objetivo", v)} />
              </Linha>
            </>
          )}

          {secao === "negocio" && (
            <>
              <Linha titulo="Tipo de negócio">
                <div className="chips">
                  {TIPOS_NEGOCIO.map((t) => (
                    <button key={t.id} type="button" className="chip" aria-pressed={form.negocio.tipo === t.id}
                      onClick={() => mudaNegocio({ tipo: form.negocio.tipo === t.id ? null : t.id })}>{t.t}</button>
                  ))}
                </div>
              </Linha>
              <Linha titulo="Nome">
                <input className="campo" value={form.negocio.nome} onChange={(e) => mudaNegocio({ nome: e.target.value })} placeholder="Nome do seu negócio" maxLength={80} aria-label="Nome do negócio" />
              </Linha>
              <Linha titulo="Site, loja ou link" dica="A logo aparece sozinha.">
                <div className="cfg-com-logo">
                  <LogoSite className="cfg-logo" site={dominio(form.negocio.link)} letra={form.negocio.nome.trim()[0]?.toUpperCase() ?? "·"} />
                  <input className="campo" value={form.negocio.link} onChange={(e) => mudaNegocio({ link: e.target.value })} placeholder="exemplo.com.br" maxLength={300} inputMode="url" aria-label="Site do negócio" />
                </div>
              </Linha>
              <Linha titulo="O que ele faz" dica="Uma frase basta.">
                <textarea className="campo cfg-texto" value={form.negocio.o_que_faz} onChange={(e) => mudaNegocio({ o_que_faz: e.target.value })} placeholder="Ex.: agenda e prontuário para clínicas pequenas" maxLength={300} rows={2} aria-label="O que o negócio faz" />
              </Linha>
            </>
          )}

          {secao === "assuntos" && (
            <>
              <Linha titulo="Assuntos" dica={form.nichos.length ? `${form.nichos.length} escolhido${form.nichos.length > 1 ? "s" : ""}` : "Nenhum escolhido: a mecha mostra de tudo."}>
                <div className="chips">
                  {(nichos ?? []).filter((n) => n.id !== "outro").map((n) => {
                    const on = form.nichos.includes(n.id);
                    return (
                      <button key={n.id} type="button" className="chip" aria-pressed={on}
                        onClick={() => muda("nichos", on ? form.nichos.filter((x) => x !== n.id) : [...form.nichos, n.id])}>{n.rotulo}</button>
                    );
                  })}
                </div>
              </Linha>
              <Linha titulo="Ver também lá fora" dica="Ideias em inglês que ainda não têm versão no Brasil.">
                <Chave ligada={form.verIngles} mudar={() => muda("verIngles", !form.verIngles)} rotulo="Ver também o que bomba lá fora" />
              </Linha>
              <Linha titulo="A busca começa em" dica="O modo que vem marcado no Início.">
                <Escolha opcoes={[{ id: "achar_ideia", t: "Achar ideia" }, { id: "achar_criativo", t: "Achar criativo" }] as const}
                  valor={form.interesse} escolher={(v) => muda("interesse", v)} />
              </Linha>
              <Linha titulo="País e idioma">
                <span className="cfg-valor">Brasil · Português</span>
              </Linha>
            </>
          )}

          {secao === "plano" && (
            <>
              <Linha titulo="Seu plano">
                <span className="cfg-plano">
                  <b>Plano {eu.plano.nome}</b>
                  {eu.plano.id !== "gratis" && <span className="mp-plano pro"><Icone nome="raio" tamanho={10} /> PRO</span>}
                </span>
              </Linha>
              <Linha titulo="Garimpos neste mês" dica="Cada busca nova no TikTok é um garimpo.">
                <div className="cfg-uso">
                  <div className="cfg-uso-barra"><i style={{ transform: `scaleX(${Math.min(1, eu.uso.garimpos / Math.max(1, eu.plano.garimpos))})` }} /></div>
                  <span><b>{eu.uso.garimpos}</b> de {eu.plano.garimpos}</span>
                </div>
              </Linha>
              <Linha titulo="Assinatura">
                <span className="cfg-valor fraco">A assinatura chega em breve.</span>
              </Linha>
            </>
          )}

          {secao === "conta" && <SecaoConta email={eu.conta.email} />}

          {secao === "conexoes" && (
            <Linha titulo="Extensão do Chrome" dica="Para ver os anúncios que estão rodando no TikTok Ads.">
              <span className="cfg-em-breve">em breve</span>
            </Linha>
          )}
        </div>

        <div className={`cfg-salvar${mudou ? " aberta" : ""}`} aria-hidden={!mudou}>
          <span>Alterações não salvas</span>
          <button type="button" className="bt3" onClick={() => setForm(salvo)} disabled={salvando} tabIndex={mudou ? 0 : -1}>Descartar</button>
          <button type="button" className="bt1" onClick={salvar} disabled={salvando} tabIndex={mudou ? 0 : -1}>
            {salvando ? <><span className="girando" aria-hidden="true" /> Salvando…</> : "Salvar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Linha({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div className="cfg-linha">
      <div className="cfg-rotulo">
        <b>{titulo}</b>
        {dica && <span>{dica}</span>}
      </div>
      <div className="cfg-controle">{children}</div>
    </div>
  );
}

function Escolha<T extends string>({ opcoes, valor, escolher }: { opcoes: readonly { id: T; t: string }[]; valor: T | null; escolher: (v: T) => void }) {
  return (
    <div className="cfg-escolha" role="radiogroup">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => escolher(o.id)}>{o.t}</button>
      ))}
    </div>
  );
}

function Chave({ ligada, mudar, rotulo }: { ligada: boolean; mudar: () => void; rotulo: string }) {
  return (
    <button type="button" className="cfg-chave" role="switch" aria-checked={ligada} aria-label={rotulo} onClick={mudar}>
      <i />
    </button>
  );
}

function SecaoConta({ email }: { email: string }) {
  const [link, setLink] = useState<"livre" | "enviando" | "enviado" | "erro">("livre");

  async function trocarSenha() {
    setLink("enviando");
    const volta = new URL("/auth/confirmar", location.origin);
    volta.searchParams.set("proximo", "/auth/nova-senha");
    const { error } = await supabaseNavegador().auth.resetPasswordForEmail(email, { redirectTo: volta.toString() });
    setLink(error ? "erro" : "enviado");
  }

  async function sair() {
    await supabaseNavegador().auth.signOut();
    location.href = "/inicio";
  }

  return (
    <>
      <Linha titulo="E-mail">
        <span className="cfg-valor">{email}</span>
      </Linha>
      <Linha titulo="Senha" dica={link === "enviado" ? `Mandamos um link para ${email}.` : link === "erro" ? "Não deu para enviar agora. Tente de novo." : "Enviamos um link para você criar uma nova."}>
        <button type="button" className="bt2 cfg-bt" onClick={trocarSenha} disabled={link === "enviando" || link === "enviado"}>
          {link === "enviando" ? "Enviando…" : link === "enviado" ? "Link enviado" : "Trocar senha"}
        </button>
      </Linha>
      <Linha titulo="Sair" dica="Sai desta conta neste navegador.">
        <button type="button" className="bt2 cfg-bt" onClick={sair}>Sair da conta</button>
      </Linha>
    </>
  );
}
