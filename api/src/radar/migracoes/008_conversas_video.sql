-- Cada turno é gravado inteiro: pergunta e resposta ficam no mesmo espaço e vídeo.
create table if not exists conversas_video (
  espaco_id uuid not null references espacos(id) on delete cascade,
  video_id text not null references videos(id) on delete cascade,
  pedido_id uuid not null,
  pergunta text not null,
  resposta text not null,
  modelo text not null,
  custo_tokens int not null,
  criado_em timestamptz not null default now(),
  primary key (espaco_id, video_id, pedido_id)
);
create index if not exists conversas_video_historico on conversas_video (espaco_id, video_id, criado_em);
create index if not exists conversas_video_dia on conversas_video (espaco_id, criado_em);
