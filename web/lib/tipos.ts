export type ItemVeredito = { k: string; ok: boolean | null; txt: string };
export type Veredito = { passa: boolean; itens: ItemVeredito[] };

export type Video = {
  id: string;
  bloqueado?: boolean;
  fonte: string;
  capa: string | null;
  autor: string | null;
  autor_nome: string | null;
  texto: string;
  gancho: string | null;
  idioma: string | null;
  views: number | null;
  likes: number | null;
  metrica: string;
  duracao_s: number | null;
  vertical: boolean | null;
  transcrito: boolean;
  sinal_software: boolean | null;
  publicado: string | null;
  url_original: string;
  prova: number | null;
  nota: number | null;
  views_dia: number | null;
  nichos: string[];
  potencial?: number | null;
  potencial_motivo?: string | null;
};

export type FichaVideo = Video & {
  garimpo_id?: string | null;
  garimpo_modo?: "ideia" | "criativo" | null;
  texto_completo: string | null;
  hashtags: string[];
  transcricao_chars: number;
  legenda_fonte: string | null;
  autor_seguidores: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
  largura: number | null;
  altura: number | null;
  visto_primeiro: string;
  visto_ultimo: string;
  termos: string[];
  saas: { id: string; nome: string; dominio: string | null; papel: string; trecho: string; inicio_s: number | null }[];
  veredito: Veredito;
};

export type Ideia = {
  id: string;
  bloqueado?: boolean;
  exemplo: boolean;
  titulo_pt: string;
  nicho: string;
  nicho_rotulo: string;
  problema: string;
  publico: string;
  views_total: number;
  crescimento: number | null;
  historia_7d: boolean;
  videos: number;
  autores: number;
  modelo: string;
  tem_versao_br: boolean | null;
  nota: number;
  veredito?: Veredito;
  serie_30d?: number[];
};

export type EstadoFonte = { fonte: string; status: string; termo?: string | null; novos?: number; detalhe?: string; etapa?: "preparando" | "buscando" | "organizando" | "cache" | "concluido" };

export type Garimpo = {
  id: string;
  modo: "ideia" | "criativo";
  termos: string[];
  fontes: string[];
  idiomas: string[];
  status: "aguardando" | "garimpando" | "concluido" | "parado" | "erro";
  agora: string | null;
  por_fonte: Record<string, Omit<EstadoFonte, "fonte">>;
  vistos: number;
  transcritos: number;
  com_saas: number;
  ideias_novas: number;
  fracos?: number;
  criado_em: string;
  fim_em: string | null;
};

export type AnaliseOportunidades = {
  status: "analisando" | "pronto" | "erro";
  etapa: "comentarios" | "analise" | null;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
  resultado: {
    nicho: string;
    resumo: string;
    dores: {
      titulo: string;
      descricao: string;
      forca_do_sinal: "alta" | "media" | "baixa";
      ideia_de_saas: string;
      por_que_software: string;
      evidencias: { video_id: string; comentario: string; fonte: string; url: string }[];
    }[];
    saas_existentes: { nome: string; o_que_faz: string; publico: string; preco: string | null; lacuna: string; url: string | null }[];
    limitacoes: string;
    evidencias_descartadas: number;
    videos_lidos: number;
    comentarios_lidos: number;
  } | null;
};

export type Eu = {
  admin?: boolean;
  conta: { email: string; nome: string | null; identificador?: string | null; bio?: string | null; whatsapp?: string | null; avatar?: string; cor_perfil?: string; cor_personagem?: string; criado_em?: string | null };
  espaco: {
    id: string;
    nome: string;
    interesse: "achar_ideia" | "achar_criativo" | null;
    nichos: string[];
    pais: string;
    idioma: string;
    ver_ingles: boolean;
    boas_vindas_ok: boolean;
    perfil: "founder" | "empresario" | "investidor" | "passeando" | null;
    objetivo: "ideias" | "criativos" | "os_dois" | null;
  };
  /** o negócio online da pessoa (SaaS, app, loja, infoproduto…) */
  meu_saas: { nome: string; tipo: "saas" | "app" | "ecommerce" | "infoproduto" | "servico" | "marketplace" | "conteudo" | "outro" | null; link: string | null; o_que_faz: string | null } | null;
  plano: { id: string; nome: string; garimpos: number };
  uso: { garimpos: number; planos_ideia: number };
};

export type Colecao = { id: string; nome: string; itens: number; capas: string[] | null };

export type PlanoDisponivel = { id: "gratis" | "pro" | "agencia"; nome: string; garimpos: number; itens_completos: number | null; preco_mensal_centavos: number };
export type CatalogoPlanos = { moeda: "BRL"; periodicidade: "mensal"; contratacao_disponivel: boolean; itens: PlanoDisponivel[] };
