-- Analista de oportunidades: comentários buscados sob demanda e o resultado da análise de um garimpo.
-- Do comentário guardamos só o texto e as curtidas, sem o nome de quem escreveu.
create table if not exists comentarios_video (
  video_id text not null references videos(id) on delete cascade,
  posicao int not null,
  texto text not null,
  curtidas int,
  primary key (video_id, posicao)
);
alter table videos add column if not exists comentarios_em timestamptz;

create table if not exists oportunidades_garimpo (
  garimpo_id uuid primary key references garimpos(id) on delete cascade,
  espaco_id uuid not null references espacos(id) on delete cascade,
  status text not null default 'analisando',  -- analisando | pronto | erro
  etapa text,                                 -- comentarios | analise
  resultado jsonb,
  erro text,
  modelo text,
  custo_usd numeric not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists oportunidades_garimpo_dia on oportunidades_garimpo (espaco_id, criado_em);
