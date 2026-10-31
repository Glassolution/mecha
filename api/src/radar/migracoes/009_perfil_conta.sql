-- Identidade da pessoa, independente do espaço e do negócio.
alter table contas add column if not exists identificador varchar(30);
alter table contas add column if not exists bio varchar(80);
alter table contas add column if not exists whatsapp varchar(16);
alter table contas add column if not exists avatar text not null default 'acenando';
alter table contas add column if not exists cor_perfil text not null default 'amarelo';
create unique index if not exists contas_identificador_unico
  on contas (lower(identificador)) where identificador is not null;
