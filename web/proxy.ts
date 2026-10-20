import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Páginas que abrem sem login. O Início é a porta de entrada: a busca é que pede login.
const PUBLICAS = ["/inicio", "/entrar", "/auth"];

/**
 * Antes de cada pedido: renova a sessão do Supabase (cookies), manda quem não entrou para /entrar e,
 * nos pedidos à nossa API (/api/*), anexa o token da sessão para a API conferir quem é.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // o link do e-mail pode voltar para a raiz com ?code=… (quando o endereço de volta não está liberado)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = searchParams.get("code") ? "/auth/confirmar" : "/inicio";
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
  const { data } = await supabase.auth.getClaims();
  const logado = !!data?.claims;

  if (pathname.startsWith("/api/")) {
    if (!logado) return resposta; // a API responde 401 e o site leva para /entrar
    const { data: sessao } = await supabase.auth.getSession(); // já conferida por getClaims acima
    const cabecalhos = new Headers(request.headers);
    if (sessao.session) cabecalhos.set("authorization", `Bearer ${sessao.session.access_token}`);
    const comToken = NextResponse.next({ request: { headers: cabecalhos } });
    resposta.cookies.getAll().forEach((c) => comToken.cookies.set(c));
    return comToken;
  }

  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = pathname === "/" ? "" : `?proximo=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (logado && pathname === "/entrar") {
    const proximo = searchParams.get("proximo");
    const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/inicio";
    return NextResponse.redirect(new URL(destino, request.url));
  }
  return resposta;
}

export const config = {
  matcher: [
    // tudo, menos arquivos estáticos, imagens e as capas (que não precisam de login)
    "/((?!_next/|api/capas|marca/|icon.png|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
