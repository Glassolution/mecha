-- Nicho provável de cada vídeo, por palavras da legenda e da fala (até o extrator de SaaS entrar).
alter table videos add column if not exists nichos text[] not null default '{}';
create index if not exists videos_nichos_idx on videos using gin (nichos);
