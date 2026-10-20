-- Respostas do quiz de boas-vindas.
alter table espacos add column if not exists perfil text;    -- founder | empresario | investidor | passeando
alter table espacos add column if not exists objetivo text;  -- ideias | criativos | os_dois
