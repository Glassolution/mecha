import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Volta do link mágico (e, no futuro, do Google): troca o código pela sessão e segue para o app.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const proximo = url.searchParams.get("proximo");
  const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/inicio";

  const supabase = await supabaseServidor();
  let erro: string | null = "O link não veio completo.";
  if (code) {
    erro = (await supabase.auth.exchangeCodeForSession(code)).error?.message ?? null;
  } else if (tokenHash && tipo) {
    erro = (await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })).error?.message ?? null;
  }
  if (erro) return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
  return NextResponse.redirect(new URL(destino, url.origin));
}
