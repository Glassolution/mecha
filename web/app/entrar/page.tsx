"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { lerBusca } from "@/lib/buscaPendente";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { Icone } from "@/components/Icone";
import { Logo } from "@/components/Logo";
import { MascoteAtor, type ModoMascote } from "@/components/MascoteAtor";
import { AbasPilula } from "@/components/Movimento";

type Modo = "entrar" | "criar" | "esqueci";
const MINIMO_SENHA = 8;

export default function PaginaEntrar() {
  return (
    <Suspense fallback={null}>
      <Entrar />
    </Suspense>
  );
}

/** Mensagens do Supabase traduzidas para quem usa. */
function traduzir(m: string): string {
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered|already been registered|user already exists/i.test(m)) return "Esse e-mail já tem conta. Entre com a sua senha.";
  if (/password.*(at least|short|weak)|weak password/i.test(m)) return `Use uma senha com pelo menos ${MINIMO_SENHA} caracteres.`;
  if (/email not confirmed/i.test(m)) return "Confirme o seu e-mail pelo link que mandamos antes de entrar.";
  if (/rate|too many|seconds/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/invalid.*email|email.*invalid/i.test(m)) return "Confira o e-mail digitado.";
  return "Não deu certo agora. Tente de novo em 1 minuto.";
}

function Entrar() {
  const sp = useSearchParams();
  const proximo = sp.get("proximo");
  const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/inicio";
  const [modo, setModo] = useState<Modo>(sp.get("modo") === "criar" ? "criar" : "entrar");
  const [buscaPendente, setBuscaPendente] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado">("livre");
  const [erro, setErro] = useState<string | null>(sp.get("erro") === "link" ? "Esse link já foi usado ou venceu. Tente de novo abaixo." : null);
  const [espera, setEspera] = useState(0);
  const [foco, setFoco] = useState<"email" | "senha" | null>(null);
  const [comemora, setComemora] = useState(0);

  // veio de uma busca no Início: mostra o que a pessoa pesquisou
  useEffect(() => {
    if (sp.get("motivo") !== "busca") return;
    const t = setTimeout(() => setBuscaPendente(lerBusca()?.texto ?? null), 0);
    return () => clearTimeout(t);
  }, [sp]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const limpo = email.trim().toLowerCase();
  // o mascote reage: lê o e-mail, fecha o olho na senha, espia quando a senha é mostrada
  const modoMascote: ModoMascote = foco === "senha" ? (verSenha ? "espiando" : "tapando") : foco === "email" ? "lendo" : "normal";
  const emailOk = /^\S+@\S+\.\S+$/.test(limpo);
  const pedeSenha = modo === "entrar" || modo === "criar";
  const podeEnviar = emailOk && (!pedeSenha || senha.length >= (modo === "criar" ? MINIMO_SENHA : 1)) && estado !== "enviando";

  function trocar(m: Modo) {
    setModo(m);
    setComemora((c) => c + 1);
    setErro(null);
    setEstado("livre");
  }

  function voltaPara(caminho: string) {
    const volta = new URL("/auth/confirmar", location.origin);
    volta.searchParams.set("proximo", caminho);
    return volta.toString();
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!podeEnviar) return;
    setEstado("enviando");
    setErro(null);
    const sb = supabaseNavegador().auth;
    let error: { message: string } | null = null;

    if (modo === "entrar") {
      ({ error } = await sb.signInWithPassword({ email: limpo, password: senha }));
      if (!error) return void (location.href = destino);
    } else if (modo === "criar") {
      const r = await sb.signUp({ email: limpo, password: senha, options: { emailRedirectTo: voltaPara(destino) } });
      error = r.error;
      // o Supabase não avisa quando o e-mail já existe: sem identidades = conta já cadastrada
      if (!error && r.data.user && (r.data.user.identities ?? []).length === 0) error = { message: "already registered" };
      if (!error && r.data.session) return void (location.href = destino);
      if (!error) {
        setEstado("enviado"); // projeto com confirmação de e-mail ligada
        return;
      }
    } else {
      ({ error } = await sb.resetPasswordForEmail(limpo, { redirectTo: voltaPara("/auth/nova-senha") }));
    }

    if (error) {
      setErro(traduzir(error.message));
      setEstado("livre");
      return;
    }
    setEstado("enviado");
    setEspera(60);
  }

  const titulos: Record<Modo, [string, string]> = {
    entrar: ["Entre na mecha", "Os vídeos de SaaS que estão bombando, em 1 minuto."],
    criar: ["Crie a sua conta", "Grátis para começar. Sem cartão."],
    esqueci: ["Esqueceu a senha?", "Mandamos um link para você criar uma senha nova."],
  };

  if (estado === "enviado") {
    return (
      <main className="entrada">
        <div className="entrada-caixa">
          <MascoteAtor comemora={1} />
          <h1 style={{ fontSize: 28, letterSpacing: "-0.035em" }}>Olhe o seu e-mail</h1>
          <p className="suave">
            Mandamos um link para <b style={{ color: "var(--ink)" }}>{limpo}</b>. Abra neste mesmo navegador.
          </p>
          <p className="fraco" style={{ fontSize: 13 }}>Não chegou? Veja a caixa de spam ou promoções.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {modo !== "criar" && (
              <button className="bt2" onClick={() => enviar()} disabled={espera > 0}>
                {espera > 0 ? `Reenviar em ${espera} s` : "Reenviar o link"}
              </button>
            )}
            <button className="bt3" onClick={() => trocar("entrar")}>Voltar</button>
          </div>
          {erro && <p className="erro-caixa" role="alert" style={{ width: "100%", textAlign: "left" }}>{erro}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="entrada">
      <div className="entrada-caixa">
        <MascoteAtor modo={modoMascote} comemora={comemora} />
        <h1 style={{ fontSize: 30, letterSpacing: "-0.035em" }}>{titulos[modo][0]}</h1>
        {buscaPendente && modo !== "esqueci" ? (
          <p className="suave">
            {modo === "criar" ? "Crie sua conta grátis" : "Entre"} para ver o que está bombando em{" "}
            <b style={{ color: "var(--ink)" }}>“{buscaPendente}”</b>. A busca roda assim que você entrar.
          </p>
        ) : (
          <p className="suave">{titulos[modo][1]}</p>
        )}

        {pedeSenha && (
          <div style={{ marginTop: 10 }}>
            <AbasPilula<"entrar" | "criar">
              rotulo="Entrar ou criar conta"
              valor={modo as "entrar" | "criar"}
              mudar={trocar}
              opcoes={[["entrar", "Entrar"], ["criar", "Criar conta"]]}
            />
          </div>
        )}

        <form onSubmit={enviar} style={{ display: "grid", gap: 10, width: "100%", marginTop: 12, textAlign: "left" }}>
          <label className="oculto" htmlFor="email">E-mail</label>
          <input
            id="email"
            className="campo campo-g"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFoco("email")}
            onBlur={() => setFoco(null)}
            autoFocus
          />
          {pedeSenha && (
            <div className="campo-senha">
              <label className="oculto" htmlFor="senha">Senha</label>
              <input
                id="senha"
                className="campo campo-g"
                type={verSenha ? "text" : "password"}
                autoComplete={modo === "criar" ? "new-password" : "current-password"}
                placeholder={modo === "criar" ? `Crie uma senha (mínimo ${MINIMO_SENHA} caracteres)` : "Sua senha"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onFocus={() => setFoco("senha")}
                onBlur={() => setFoco(null)}
              />
              <button type="button" className="ver-senha" onMouseDown={(e) => e.preventDefault()} onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder a senha" : "Mostrar a senha"}>
                <Icone nome={verSenha ? "fechado" : "olho"} tamanho={17} />
              </button>
            </div>
          )}
          {modo === "criar" && senha.length > 0 && senha.length < MINIMO_SENHA && (
            <p className="fraco" style={{ fontSize: 12.5, margin: "-2px 4px 0" }}>Faltam {MINIMO_SENHA - senha.length} caracteres.</p>
          )}
          {modo === "entrar" && (
            <button type="button" className="link-sutil" style={{ justifySelf: "end", marginTop: -2 }} onClick={() => trocar("esqueci")}>
              Esqueci a senha
            </button>
          )}
          <button className="bt1 bt-g" disabled={!podeEnviar}>
            {estado === "enviando" ? (
              <><span className="girando" aria-hidden="true" /> Um instante…</>
            ) : (
              <>
                {{ entrar: "Entrar", criar: "Criar conta", esqueci: "Mandar o link" }[modo]}
                <Icone nome="direita" tamanho={16} />
              </>
            )}
          </button>
        </form>

        {erro && <p className="erro-caixa" role="alert" style={{ width: "100%", textAlign: "left" }}>{erro}</p>}

        <div className="entrar-ou" style={{ width: "100%" }}><span>ou</span></div>
        <div style={{ display: "grid", gap: 8, width: "100%" }}>
          {modo === "esqueci" && (
            <button className="bt2 bt-g" onClick={() => trocar("entrar")}>Voltar para entrar</button>
          )}
          <button type="button" className="bt2 bt-g" disabled title="Chega em breve">
            Entrar com o Google <span className="fraco" style={{ fontSize: 12, fontWeight: 400 }}>em breve</span>
          </button>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10, justifyItems: "center" }}>
          <Link href="/inicio" className="link-sutil">Voltar ao início</Link>
          <Link href="/inicio" aria-label="mecha, voltar ao início" style={{ opacity: 0.8 }}><Logo tamanho={18} /></Link>
        </div>
      </div>
    </main>
  );
}
