import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase no navegador. Usa só a chave pública (feita para ficar no navegador).
export function supabaseNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
