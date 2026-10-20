import { redirect } from "next/navigation";

// O Explorar foi retirado; endereços antigos voltam para o Início.
export default function Explorar() {
  redirect("/inicio");
}
