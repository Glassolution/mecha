import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/auth";

// Só a entrada e a confirmação do e-mail abrem sem uma sessão válida.
const PUBLICAS = new Set(["/entrar", "/auth/confirmar"]);

/**
 * Antes de cada pedido: renova a sessão do Supabase (cookies), manda quem não entrou para /entrar e,
 * nos pedidos à nossa API (/api/*), anexa o token da sessão para a API conferir quem é.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // o link do e-mail pode voltar para a raiz com ?code=… (quando o endereço de volta não está liberado)
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirmar";
    return NextResponse.redirect(url);
  }

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // Não colocar nada entre createServerClient e getClaims (recomendação do Supabase).
  const { data, error } = await supabase.auth.getClaims();
  const logado = !error && !!data?.claims?.sub;

  function finalizar(saida: NextResponse) {
    resposta.cookies.getAll().forEach((cookie) => saida.cookies.set(cookie));
    saida.headers.set("Cache-Control", "private, no-store");
    return saida;
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const semLogin = () => finalizar(NextResponse.json({ mensagem: "Entre para continuar." }, { status: 401 }));
    if (!logado) return semLogin();
    const { data: sessao } = await supabase.auth.getSession(); // já conferida por getClaims acima
    const cabecalhos = new Headers(request.headers);
    if (!sessao.session) return semLogin();
    cabecalhos.set("authorization", `Bearer ${sessao.session.access_token}`);
    const comToken = NextResponse.next({ request: { headers: cabecalhos } });
    return finalizar(comToken);
  }

  const publica = PUBLICAS.has(pathname);
  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = pathname === "/" ? "" : `?proximo=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return finalizar(NextResponse.redirect(url));
  }
  if (logado && pathname === "/entrar") {
    return finalizar(NextResponse.redirect(new URL(destinoSeguro(searchParams.get("proximo")), request.url)));
  }
  if (pathname === "/") return finalizar(NextResponse.redirect(new URL("/inicio", request.url)));
  return finalizar(resposta);
}

export const config = {
  matcher: [
    // Exceções restritas aos arquivos estáticos reais; capas e rotas /auth também são protegidas.
    "/((?!_next/static/|_next/image|marca/|icon\\.png$|favicon\\.ico$).*)",
  ],
};
