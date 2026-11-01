-- Checkout transparente: cada tentativa de assinar com cartão fica registrada (sem nenhum dado do cartão)
-- para limitar quantas vezes um espaço pode tentar e impedir o teste de cartões roubados.
create table if not exists tentativas_cartao (
  id bigserial primary key,
  espaco_id uuid not null references espacos(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index if not exists tentativas_cartao_espaco on tentativas_cartao (espaco_id, criado_em);

alter table tentativas_cartao enable row level security;
