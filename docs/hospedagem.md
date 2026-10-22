# Hospedagem do mecha

| Parte | Onde | Custo |
|---|---|---|
| Site (`web/`) | Vercel, plano Hobby | grátis |
| API + trabalhador (`api/`) | Render, Web Service grátis, um serviço só | grátis |
| Fila (Redis) | Render Key Value grátis | grátis |
| Capas | Supabase Storage, balde público `capas` | grátis até 1 GB |
| Banco | Supabase, projeto Mecha (us-west-2), plano grátis | grátis até 500 MB |

O preço do grátis no Render: depois de 15 minutos sem ninguém usar, o servidor dorme e a primeira pessoa espera
cerca de 1 minuto até ele acordar. O disco também some quando ele dorme, por isso as capas vão para o Supabase.
Quando começar a cobrar, trocar para um plano pago do Render ou para a Railway (o `api/railway.json` já está pronto).

## Arquivos

- `render.yaml`: o Blueprint (API + fila, região oregon, perto do banco).
- `api/Dockerfile`: imagem com Python 3.12 e as dependências do `uv.lock`.
- `api/iniciar.sh`: aplica as migrações e liga a API e o trabalhador juntos.
- `api/src/radar/migracoes/007_trancar_tabelas.sql`: liga a RLS em todas as tabelas. Obrigatória no Supabase,
  senão a chave publicável (que está no navegador) daria acesso às tabelas pela Data API.

## Passo a passo

### 1. Pegar duas coisas no Supabase (projeto Mecha)
- **Project Settings → API Keys → Secret keys:** copiar a chave secreta (`sb_secret_…`). Vai no `SUPABASE_SECRET_KEY`.
- **Connect → Session pooler:** a "connection string" com a senha no lugar de `[YOUR-PASSWORD]`
  (é o `SUPABASE_DB_URL` do `.env`). Tem que ser o **Session pooler**: a conexão direta é só IPv6 e o Render não alcança.

### 2. Render
1. Criar conta em render.com entrando com o GitHub e liberar o acesso ao repositório `Glassolution/mecha`.
2. **New → Blueprint →** escolher `Glassolution/mecha`. O Render lê o `render.yaml` e mostra `mecha-api` e `mecha-fila`.
3. Preencher o que ele pedir:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Session pooler (passo 1) |
| `SUPABASE_URL` | do `.env` |
| `SUPABASE_SECRET_KEY` | a chave secreta (passo 1) |
| `APIFY_TOKEN` | do `.env` |
| `DONOS` | do `.env` |
| `SITE_URL` | o endereço do site na Vercel, com `https://` |

`REDIS_URL`, `DB_CONEXOES`, `AMBIENTE=producao` e `COOKIE_SEGURO=true` já vêm do `render.yaml`.
`AMBIENTE` nunca pode ser `teste`: no modo teste a API aceita login sem senha.

4. **Apply.** O primeiro deploy leva uns 5 minutos. Na primeira vez a API cria as tabelas e o balde `capas`.
5. Copiar o endereço do `mecha-api` (algo como `https://mecha-api.onrender.com`).

### 3. Vercel
1. **Environment Variables → Add:** `RADAR_API_URL` = o endereço do `mecha-api`, com `https://` e sem barra no fim.
2. **Deployments → Redeploy** (a variável só vale num deploy novo).

### 4. Conferir
- `https://<endereço-do-mecha-api>/api/saude` responde `{"ok":true}`.
- No site da Vercel: entrar e fazer um garimpo.
