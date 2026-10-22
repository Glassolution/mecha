# Hospedagem do mecha

| Parte | Onde | Custo |
|---|---|---|
| Site (`web/`) | Vercel, plano Hobby | grátis |
| API + trabalhador (`api/`) | Railway, plano Hobby, um serviço só | US$ 5/mês (já inclui US$ 5 de uso) |
| Fila (Redis) | Railway, no mesmo projeto | entra nos US$ 5 |
| Capas | Disco (volume) do serviço da API, em `/data` | ~US$ 0,15 por GB |
| Banco | Supabase (o mesmo projeto do login), plano grátis | grátis até 500 MB |

Por que a Railway e não o Upstash para o Redis: o trabalhador (arq) consulta a fila várias vezes por segundo,
o que passa de 5 milhões de comandos por mês, e o grátis do Upstash é 500 mil.

## Arquivos

- `api/Dockerfile`: monta a imagem com Python 3.12 e as dependências do `uv.lock`.
- `api/iniciar.sh`: aplica as migrações e liga a API e o trabalhador juntos (o trabalhador grava as capas que a API serve).
- `api/railway.json`: diz à Railway para usar o Dockerfile e conferir `/api/saude`.
- `api/src/radar/migracoes/007_trancar_tabelas.sql`: liga a RLS em todas as tabelas. Obrigatória no Supabase,
  senão a chave publicável (que está no navegador) daria acesso às tabelas pela Data API.

## Passo a passo

### 1. Railway
1. Criar conta em railway.com (entrar com o GitHub) e assinar o Hobby.
2. **New Project → Deploy from GitHub repo →** `Glassolution/mecha`.
3. No serviço criado: **Settings → Source → Root Directory:** `api`.
4. **Settings → Config-as-code → Railway config file:** `api/railway.json`.
5. No projeto: **+ Create → Database → Redis**.
6. No serviço da API: **+ Volume**, montado em `/data`.
7. **Variables** do serviço da API (tabela abaixo).
8. **Settings → Networking → Generate Domain.** Esse endereço é o `RADAR_API_URL`.

### 2. Variáveis da Railway (serviço da API)

| Nome | Valor |
|---|---|
| `DATABASE_URL` | o valor de `SUPABASE_DB_URL` do `.env` (Session pooler, porta 5432) |
| `DB_CONEXOES` | `5` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (a Railway preenche sozinha) |
| `APIFY_TOKEN` | do `.env` |
| `SUPABASE_URL` | do `.env` |
| `DONOS` | do `.env` |
| `AMBIENTE` | `producao` (nunca `teste`: no modo teste a API aceita login sem senha) |
| `COOKIE_SEGURO` | `true` |
| `SITE_URL` | o endereço do site na Vercel |

`ANTHROPIC_API_KEY`, `TYPESAFE_API_KEY` e `YOUTUBE_API_KEY` ainda não são usadas pela API; só colocar quando forem.

### 3. Vercel
1. **Environment Variables → Add:** `RADAR_API_URL` = o domínio da Railway, com `https://` e sem barra no fim.
2. **Deployments → Redeploy** (a variável só vale num deploy novo).

### 4. Conferir
- `https://<domínio-da-railway>/api/saude` responde `{"ok":true}`.
- No site da Vercel: entrar e fazer um garimpo.
