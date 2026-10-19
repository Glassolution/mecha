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
};

export type FichaVideo = Video & {
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

export type EstadoFonte = { fonte: string; status: string; termo?: string | null; novos?: number; detalhe?: string };

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
  criado_em: string;
  fim_em: string | null;
};

export type Eu = {
  conta: { email: string; nome: string | null };
  espaco: {
    id: string;
    nome: string;
    interesse: "achar_ideia" | "achar_criativo" | null;
    nichos: string[];
    pais: string;
    idioma: string;
    ver_ingles: boolean;
    boas_vindas_ok: boolean;
  };
  plano: { id: string; nome: string; garimpos: number };
  uso: { garimpos: number; planos_ideia: number };
};

export type Colecao = { id: string; nome: string; itens: number; capas: string[] | null };
