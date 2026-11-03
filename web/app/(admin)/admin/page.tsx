import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { emailAdmin } from "@/lib/admin";
import { PainelAdmin } from "@/components/PainelAdmin";

export const metadata = { title: "Administração — Cleo" };

export default async function Admin() {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/entrar?proximo=%2Fadmin");
  if (!emailAdmin(data.user.email)) redirect("/inicio");
  return <PainelAdmin />;
}
