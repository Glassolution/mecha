-- Esquema inicial do Radar (docs/radar-saas.md, seção 4)
create extension if not exists vector;

-- biblioteca: vídeos
create table videos (
  id text primary key,                 -- 'tt:<id>', 'yt:<id>', 'tta:<id>', 'meta:<id>', 'ig:<id>'
  fonte text not null,                 -- tiktok | youtube | tiktok_ads | meta_ads | instagram
  tipo_item text not null,             -- post | anuncio
  idioma text,
  autor text,                          -- @usuario, como está na plataforma
  autor_nome text,
  autor_seguidores bigint,
  texto text,
  hashtags text[] not null default '{}',
  termos text[] not null default '{}',
  transcricao text,                    -- legenda da plataforma, até 4.000 caracteres
  transcricao_tempos jsonb,            -- [[segundo, posição no texto], ...]
  legenda_fonte text,                  -- ASR (fala original) | MT (tradução automática)
  sinal_software boolean,              -- filtro barato (regra 7)
  capa_path text,                      -- nossa cópia da capa
  capa_origem text,                    -- link da capa na fonte (expira)
  video_url text,
  url_original text not null,
  views bigint, likes bigint, comentarios bigint, compartilhamentos bigint, salvamentos bigint,
  dias_no_ar int, ativo boolean, ctr numeric, objetivo text, setor text,
  duracao_s int, largura int, altura int, vertical boolean,
  descricao_visual text,
  publicado timestamptz,
  visto_primeiro timestamptz not null default now(),
  visto_ultimo timestamptz not null default now()
);
create index videos_fonte_idx on videos (fonte);
create index videos_views_idx on videos (views desc nulls last);
create index videos_termos_idx on videos using gin (termos);

create table metricas_hist (
  video_id text references videos(id) on delete cascade,
  dia date,
  views bigint, likes bigint,
  primary key (video_id, dia)
);

-- biblioteca: SaaS citados
create table saas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dominio text unique,
  resumo_pt text, problema text, publico text,
  nicho text,
  modelo text,
  preco_visto text,
  tem_versao_br boolean,
  embedding vector(1024),
  criado_em timestamptz not null default now()
);

create table video_saas (
  video_id text references videos(id) on delete cascade,
  saas_id uuid references saas(id) on delete cascade,
  papel text, trecho text, inicio_s int, confianca int,
  primary key (video_id, saas_id)
);

create table ideias (
  id uuid primary key default gen_random_uuid(),
  titulo_pt text, problema text, nicho text,
  saas_ids uuid[] not null default '{}',
  videos int, views_total bigint,
  velocidade numeric, nota int,
  embedding vector(1024),
  atualizado_em timestamptz not null default now()
);

create table avaliacoes (
  video_id text primary key references videos(id) on delete cascade,
  notas jsonb,
  formato text, gancho text, gancho_pt text, gancho_tipo text,
  replica jsonb,
  prova int, criativo int, nota int,
  versao_perguntas text not null,
  avaliado_em timestamptz not null default now()
);

create table busca_cache (
  termo text, fonte text, idioma text,
  buscado_em timestamptz not null default now(),
  video_ids text[] not null default '{}',
  primary key (termo, fonte, idioma)
);

-- contas e espaços
create table contas (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nome text,
  criado_em timestamptz not null default now()
);

create table sessoes (
  id text primary key,                 -- valor aleatório guardado no cookie httpOnly
  conta_id uuid not null references contas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);

create table espacos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid references contas(id) on delete cascade,
  nome text not null,
  interesse text,                      -- achar_ideia | achar_criativo
  nichos text[] not null default '{}',
  pais text not null default 'BR',
  idioma text not null default 'pt',
  ver_ingles boolean not null default true,
  plano text not null default 'gratis',
  boas_vindas_ok boolean not null default false,
  criado_em timestamptz not null default now()
);

create table membros (
  espaco_id uuid references espacos(id) on delete cascade,
  conta_id uuid references contas(id) on delete cascade,
  papel text,
  primary key (espaco_id, conta_id)
);

create table garimpos (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid references espacos(id) on delete cascade,
  modo text not null default 'ideia',  -- ideia | criativo
  termos text[] not null default '{}',
  termos_idioma jsonb not null default '{}',
  fontes text[] not null default '{}',
  idiomas text[] not null default '{}',
  criterios jsonb not null default '{}',
  status text not null default 'aguardando',  -- aguardando | garimpando | concluido | parado | erro
  agora text,                          -- o que está acontecendo, em uma frase
  por_fonte jsonb not null default '{}',
  vistos int not null default 0,
  transcritos int not null default 0,
  com_saas int not null default 0,
  ideias_novas int not null default 0,
  custo_usd numeric not null default 0,
  criado_em timestamptz not null default now(),
  fim_em timestamptz
);
create index garimpos_espaco_idx on garimpos (espaco_id, criado_em desc);

create table garimpo_videos (
  garimpo_id uuid references garimpos(id) on delete cascade,
  video_id text references videos(id) on delete cascade,
  termo text,
  chegou_em timestamptz not null default now(),
  primary key (garimpo_id, video_id)
);

create table colecoes (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid references espacos(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

create table salvos (
  colecao_id uuid references colecoes(id) on delete cascade,
  item_tipo text not null,             -- video | ideia
  item_id text not null,
  salvo_em timestamptz not null default now(),
  primary key (colecao_id, item_tipo, item_id)
);

create table meus_saas (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid references espacos(id) on delete cascade,
  nome text, link text, o_que_faz text, publico text, preco text
);

create table estudio_saidas (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid references espacos(id) on delete cascade,
  ideia_id uuid references ideias(id),
  video_id text references videos(id),
  meu_saas_id uuid references meus_saas(id),
  tipo text,                           -- plano_ideia | ganchos | roteiro | video
  conteudo jsonb, status text,
  creditos int not null default 0,
  criado_em timestamptz not null default now()
);

create table uso (
  espaco_id uuid references espacos(id) on delete cascade,
  mes date,
  garimpos int not null default 0,
  planos_ideia int not null default 0,
  creditos_video int not null default 0,
  downloads int not null default 0,
  primary key (espaco_id, mes)
);
