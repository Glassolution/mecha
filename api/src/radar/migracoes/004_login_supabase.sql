-- Login pelo Supabase Auth: cada conta guarda o id do usuário no Supabase (auth.users.id).
alter table contas add column if not exists auth_id uuid unique;
