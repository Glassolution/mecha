-- Análise de IA de um vídeo para um espaço: "vale criar um SaaS em cima disso?". Uma por espaço e vídeo.
create table if not exists analises_video (
  espaco_id uuid not null references espacos(id) on delete cascade,
  video_id text not null references videos(id) on delete cascade,
  resultado jsonb not null,
  modelo text not null,
  custo_tokens int,
  criado_em timestamptz not null default now(),
  primary key (espaco_id, video_id)
);
create index if not exists analises_video_dia on analises_video (espaco_id, criado_em);
