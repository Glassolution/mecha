-- Assinaturas pelo Asaas. O plano do espaço só muda pelos avisos (webhooks) do Asaas, nunca pela tela.

-- o cliente do Asaas fica no espaço: quem assina de novo reaproveita o mesmo cadastro (o Asaas aceita duplicados)
alter table espacos add column if not exists asaas_cliente text;

create table if not exists assinaturas (
  id uuid primary key default gen_random_uuid(),   -- vai como externalReference para achar a assinatura após um timeout
  espaco_id uuid not null references espacos(id) on delete cascade,
  plano text not null,                             -- pro | agencia
  forma text not null,                             -- pix | cartao
  asaas_assinatura text unique,                    -- sub_… (null só entre o pedido e a resposta do Asaas)
  -- aguardando: criada, primeiro pagamento pendente | ativa | atrasada: cobrança vencida, ainda na tolerância
  -- cancelada: não renova, acesso até pago_ate | reembolsada: estornada ou contestada, acesso cortado
  -- encerrada: passou de pago_ate
  status text not null default 'aguardando',
  pago_ate timestamptz,                            -- vencimento pago + 1 mês + tolerância
  primeiro_pagamento_em timestamptz,               -- conta os 7 dias de arrependimento
  link_pagamento text,                             -- fatura do primeiro pagamento
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- no máximo uma assinatura viva por espaço
create unique index if not exists assinaturas_uma_viva on assinaturas (espaco_id)
  where status in ('aguardando', 'ativa', 'atrasada');

create table if not exists pagamentos (
  id text primary key,                             -- pay_… do Asaas
  assinatura_id uuid references assinaturas(id) on delete set null,
  espaco_id uuid references espacos(id) on delete set null,
  valor_centavos int not null,
  forma text,                                      -- billingType do Asaas
  status text not null,                            -- status do Asaas, guardado como veio
  vencimento date,
  pago_em timestamptz,
  estornado_centavos int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pagamentos_assinatura on pagamentos (assinatura_id);

-- cada aviso do Asaas é gravado antes de responder 200 e processado uma vez só (o Asaas pode reenviar)
create table if not exists asaas_eventos (
  id text primary key,                             -- evt_… (igual nos reenvios)
  tipo text not null,
  dados jsonb not null,
  status text not null default 'pendente',         -- pendente | feito | erro
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);
create index if not exists asaas_eventos_pendentes on asaas_eventos (recebido_em) where status <> 'feito';

-- mesma proteção da 007: a Data API do Supabase não enxerga nada
alter table assinaturas enable row level security;
alter table pagamentos enable row level security;
alter table asaas_eventos enable row level security;
