-- No Supabase, toda tabela do schema public também fica aberta pela "Data API", e a chave publicável
-- está no navegador de qualquer visitante: sem isto, alguém poderia ler contas ou se dar o plano Pro.
-- Liga a RLS sem nenhuma política: a Data API não vê nada, e a nossa API (dona das tabelas) continua igual.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
