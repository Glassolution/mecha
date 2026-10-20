// Rótulos das respostas do quiz (usados no quiz de boas-vindas e em Configurações).

export type TipoNegocio = "saas" | "app" | "ecommerce" | "infoproduto" | "servico" | "marketplace" | "conteudo" | "outro";

export const TIPOS_NEGOCIO: { id: TipoNegocio; t: string }[] = [
  { id: "saas", t: "SaaS / software" },
  { id: "app", t: "App" },
  { id: "ecommerce", t: "E-commerce / loja" },
  { id: "infoproduto", t: "Infoproduto / curso" },
  { id: "servico", t: "Serviço / agência" },
  { id: "marketplace", t: "Marketplace" },
  { id: "conteudo", t: "Conteúdo / mídia" },
  { id: "outro", t: "Outro" },
];
