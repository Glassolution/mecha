-- A cor da personagem é independente da cor principal do perfil.
alter table contas add column if not exists cor_personagem text not null default 'amarelo';
