-- Triagem da busca: nota de 0 a 100 do potencial de SaaS de cada vídeo (Gemini). Vídeo fraco não entra no garimpo.
alter table videos add column if not exists potencial_saas smallint;
alter table videos add column if not exists potencial_motivo text;
alter table garimpos add column if not exists fracos int not null default 0;
