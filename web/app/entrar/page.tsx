"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { destinoSeguro } from "@/lib/auth";
import { Icone } from "@/components/Icone";
import { Logo } from "@/components/Logo";
import { PreviaInicio } from "./PreviaInicio";
import styles from "./entrar.module.css";

type Modo = "entrar" | "criar" | "esqueci";
const MINIMO_SENHA = 8;
const PREVIAS = [
  { titulo: <>Seu próximo SaaS começa<br />com uma <em>boa ideia.</em></>, texto: "Descubra o que está ganhando atenção. Encontre ideias e criativos para o seu próximo grande começo." },
  { titulo: <>Uma boa referência.<br /><em>Mil possibilidades.</em></>, texto: "Guarde os vídeos que chamaram sua atenção e organize suas referências em um só lugar." },
  { titulo: <>Da inspiração à sua<br /><em>próxima criação.</em></>, texto: "Leve as referências para o Estúdio e dê o próximo passo com ideias para o seu negócio." },
];

function traduzir(m: string): string {
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered|already been registered|user already exists/i.test(m)) return "Esse e-mail já tem conta. Entre com a sua senha.";
  if (/password.*(at least|short|weak)|weak password/i.test(m)) return `Use uma senha com pelo menos ${MINIMO_SENHA} caracteres.`;
  if (/email not confirmed/i.test(m)) return "Confirme o seu e-mail pelo link que enviamos antes de entrar.";
  if (/rate|too many|seconds/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/invalid.*email|email.*invalid/i.test(m)) return "Confira o e-mail digitado.";
  return "Não foi possível conectar. Tente de novo em um instante.";
}

export default function PaginaEntrar() {
  return <Suspense fallback={<main className={styles.pagina} aria-busy="true" aria-label="Carregando a entrada" />}><Entrar /></Suspense>;
}

function Entrar() {
  const sp = useSearchParams();
  const destino = destinoSeguro(sp.get("proximo"));
  const [modo, setModo] = useState<Modo>(sp.get("modo") === "criar" ? "criar" : "entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado">("livre");
  const [erro, setErro] = useState<string | null>(sp.get("erro") === "link" ? "Esse link já foi usado ou venceu. Peça um novo abaixo." : null);
  const [espera, setEspera] = useState(0);
  const [previa, setPrevia] = useState(0);
  const limpo = email.trim().toLowerCase();
  const pedeSenha = modo !== "esqueci";
  const enviando = estado === "enviando";
  const podeEnviar = /^\S+@\S+\.\S+$/.test(limpo) && (!pedeSenha || senha.length >= (modo === "criar" ? MINIMO_SENHA : 1)) && !enviando;

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  function trocar(novo: Modo) {
    setModo(novo);
    setErro(null);
    setSenha("");
    setVerSenha(false);
    setEstado("livre");
  }

  function voltaPara(caminho: string) {
    const volta = new URL("/auth/confirmar", location.origin);
    volta.searchParams.set("proximo", caminho);
    return volta.toString();
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!podeEnviar || (modo === "esqueci" && espera > 0)) return;
    setEstado("enviando");
    setErro(null);
    try {
      const sb = supabaseNavegador().auth;
      if (modo === "entrar") {
        const { error } = await sb.signInWithPassword({ email: limpo, password: senha });
        if (error) throw error;
        location.assign(destino);
        return;
      }
      if (modo === "criar") {
        const { data, error } = await sb.signUp({ email: limpo, password: senha, options: { emailRedirectTo: voltaPara(destino) } });
        if (error) throw error;
        if (data.user && (data.user.identities ?? []).length === 0) throw new Error("already registered");
        if (data.session) {
          location.assign(destino);
          return;
        }
      } else {
        const { error } = await sb.resetPasswordForEmail(limpo, { redirectTo: voltaPara("/auth/nova-senha") });
        if (error) throw error;
      }
      setEstado("enviado");
      setEspera(60);
    } catch (err) {
      setErro(traduzir(err instanceof Error ? err.message : ""));
      setEstado("livre");
    }
  }

  const titulos = { entrar: "Boas-vindas à Cleo", criar: "Seu próximo começo", esqueci: "Vamos recuperar sua senha" };
  const descricoes = { entrar: "Um lugar para encontrar ideias que merecem sair do papel. Entre e comece seu próximo garimpo.", criar: "Crie sua conta e encontre inspiração para o seu negócio. Grátis para começar, sem cartão.", esqueci: "Digite seu e-mail. Vamos enviar um link para você criar uma senha nova." };
  const slide = PREVIAS[previa];

  return (
    <main className={styles.pagina}>
      <section className={styles.ladoFormulario} aria-label="Acesse sua conta">
        <div className={styles.formulario}>
          <div className={styles.marca}><Logo tamanho={27} /></div>
          {estado === "enviado" ? (
            <div className={styles.confirmacao}>
              <div className={styles.iconeEmail}><Icone nome="check" tamanho={28} /></div>
              <h1>Olhe o seu e-mail</h1>
              <p role="status">{modo === "criar" ? "Enviamos um link de confirmação para" : "Se houver uma conta com este e-mail, você receberá um link em"} <strong>{limpo}</strong>. Abra o link neste navegador para continuar.</p>
              <p className={styles.dica}>Não chegou? Confira a caixa de spam e promoções.</p>
              {modo === "esqueci" && <button className={styles.principal} onClick={() => enviar()} disabled={espera > 0}>{espera > 0 ? `Reenviar em ${espera} s` : "Reenviar o link"}</button>}
              <button className={styles.voltar} onClick={() => trocar("entrar")}><Icone nome="voltar" tamanho={16} /> Voltar para entrar</button>
            </div>
          ) : (
            <>
              <header className={styles.cabecalho}><h1>{titulos[modo]}</h1><p>{descricoes[modo]}</p></header>
              <form onSubmit={enviar} className={styles.campos} aria-busy={enviando}>
                <div className={styles.campoGrupo}>
                  <label htmlFor="email">Seu e-mail</label>
                  <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={enviando} aria-describedby={erro ? "erro-login" : undefined} />
                </div>
                {pedeSenha && <div className={styles.campoGrupo}>
                  <div className={styles.rotuloSenha}><label htmlFor="senha">{modo === "criar" ? "Crie uma senha" : "Sua senha"}</label>{modo === "entrar" && <button type="button" onClick={() => trocar("esqueci")} disabled={enviando}>Esqueci a senha</button>}</div>
                  <div className={styles.senha}>
                    <input id="senha" name="password" type={verSenha ? "text" : "password"} autoComplete={modo === "criar" ? "new-password" : "current-password"} placeholder={modo === "criar" ? "Pelo menos 8 caracteres" : "Digite sua senha"} value={senha} onChange={(e) => setSenha(e.target.value)} minLength={modo === "criar" ? MINIMO_SENHA : 1} required disabled={enviando} aria-describedby={erro ? "erro-login" : undefined} />
                    <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder a senha" : "Mostrar a senha"} aria-pressed={verSenha}><Icone nome={verSenha ? "fechado" : "olho"} tamanho={19} /></button>
                  </div>
                </div>}
                {erro && <p id="erro-login" className={styles.erro} role="alert">{erro}</p>}
                <button className={styles.principal} disabled={!podeEnviar || (modo === "esqueci" && espera > 0)} type="submit">
                  {enviando ? <><span className={styles.carregando} /> Um instante…</> : <>{{ entrar: "Entrar na Cleo", criar: "Criar minha conta", esqueci: espera > 0 ? `Reenviar em ${espera} s` : "Enviar link de recuperação" }[modo]}<Icone nome="direita" tamanho={19} /></>}
                </button>
              </form>
              {modo === "esqueci" ? <button className={styles.voltar} onClick={() => trocar("entrar")} disabled={enviando}><Icone nome="voltar" tamanho={16} /> Voltar para entrar</button> : <>
                <div className={styles.divisor}><span>ou</span></div>
                <button className={styles.secundario} onClick={() => trocar(modo === "entrar" ? "criar" : "entrar")} disabled={enviando}>{modo === "entrar" ? "Criar uma conta grátis" : "Já tenho uma conta"}</button>
                <p className={styles.nota}>{modo === "entrar" ? "Um bom começo pode estar a um garimpo de distância." : "Sua próxima ideia merece um lugar para começar."}</p>
              </>}
            </>
          )}
        </div>
        <footer className={styles.rodape}><span>Cleo © {new Date().getFullYear()}</span><span><Icone nome="cadeado" tamanho={12} /> Seu espaço começa aqui</span></footer>
      </section>

      <aside className={styles.apresentacao} aria-label="Conheça a Cleo">
        <PreviaInicio />
        <div className={styles.textoApresentacao} key={previa}><h2>{slide.titulo}</h2><p>{slide.texto}</p></div>
        <div className={styles.paginacao} role="group" aria-label="Destaques da Cleo">{PREVIAS.map((_, i) => <button key={i} onClick={() => setPrevia(i)} aria-label={`Ver destaque ${i + 1}`} aria-pressed={previa === i}><span /></button>)}</div>
      </aside>
    </main>
  );
}
