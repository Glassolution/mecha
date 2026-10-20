"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { Icone } from "@/components/Icone";
import { MascoteAtor } from "@/components/MascoteAtor";

const MINIMO_SENHA = 8;

// Chega aqui pelo link de "Esqueci a senha" (a sessão de recuperação já foi aberta em /auth/confirmar).
export default function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState<"livre" | "salvando">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const [focoSenha, setFocoSenha] = useState(false);

  const iguais = senha === repetir;
  const pode = senha.length >= MINIMO_SENHA && iguais && estado === "livre";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!pode) return;
    setEstado("salvando");
    setErro(null);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    if (error) {
      setErro(/session|jwt|auth/i.test(error.message)
        ? "O link de troca de senha venceu. Peça um novo na tela de entrada."
        : /same|different/i.test(error.message)
          ? "Use uma senha diferente da anterior."
          : "Não deu para salvar a senha agora. Tente de novo.");
      setEstado("livre");
      return;
    }
    location.href = "/inicio";
  }

  return (
    <main className="entrada">
      <div className="entrada-caixa">
        <MascoteAtor modo={focoSenha ? (ver ? "espiando" : "tapando") : "normal"} />
        <h1 style={{ fontSize: 28, letterSpacing: "-0.035em" }}>Crie uma senha nova</h1>
        <p className="suave">Pelo menos {MINIMO_SENHA} caracteres.</p>
        <form onSubmit={salvar} style={{ display: "grid", gap: 10, width: "100%", marginTop: 12 }}>
          <div className="campo-senha">
            <label className="oculto" htmlFor="nova">Senha nova</label>
            <input id="nova" className="campo campo-g" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Senha nova"
              value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus onFocus={() => setFocoSenha(true)} onBlur={() => setFocoSenha(false)} />
            <button type="button" className="ver-senha" onMouseDown={(e) => e.preventDefault()} onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}>
              <Icone nome={ver ? "fechado" : "olho"} tamanho={17} />
            </button>
          </div>
          <label className="oculto" htmlFor="repetir">Repita a senha nova</label>
          <input id="repetir" className="campo campo-g" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha nova"
            value={repetir} onChange={(e) => setRepetir(e.target.value)} onFocus={() => setFocoSenha(true)} onBlur={() => setFocoSenha(false)} />
          {repetir.length > 0 && !iguais && <p className="fraco" style={{ fontSize: 12.5, textAlign: "left" }}>As duas senhas ainda não são iguais.</p>}
          <button className="bt1 bt-g" disabled={!pode}>
            {estado === "salvando" ? <><span className="girando" aria-hidden="true" /> Salvando…</> : "Salvar e entrar"}
          </button>
        </form>
        {erro && (
          <p className="erro-caixa" role="alert" style={{ width: "100%", textAlign: "left" }}>
            {erro} <Link href="/entrar" style={{ textDecoration: "underline" }}>Ir para a entrada</Link>
          </p>
        )}
      </div>
    </main>
  );
}
