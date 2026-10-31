import { Moldura } from "@/components/Moldura";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/entrar");
  return <Moldura>{children}</Moldura>;
}
