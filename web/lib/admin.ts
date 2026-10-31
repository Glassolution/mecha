/** A mesma lista restrita conferida pela API a partir da sessão assinada. */
export function emailAdmin(email?: string | null): boolean {
  return email?.trim().toLowerCase() === "xavierluisfelipe12@gmail.com";
}
