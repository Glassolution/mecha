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
| `GEMINI_API_KEY` | do `.env` (análise de vídeos, chat e oportunidades) |
| `DONOS` | do `.env` |
| `SITE_URL` | o endereço do site na Vercel, com `https://` |
| `ASAAS_API_KEY` | a chave do Asaas (Sandbox: `$aact_hmlg_…`) |
| `ASAAS_WEBHOOK_TOKEN` | o mesmo token colado no webhook do Asaas (passo 5) |

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

### 5. Asaas (assinaturas)
1. **Sandbox primeiro:** criar conta em sandbox.asaas.com → Integrações → Chaves de API → gerar chave. Ela aparece uma vez só.
   Vai no `ASAAS_API_KEY` (no `.env` e no Render). `ASAAS_AMBIENTE` fica `sandbox`.
2. Inventar um token com 32 a 255 caracteres, sem espaços (ex.: `openssl rand -hex 32`). Vai no `ASAAS_WEBHOOK_TOKEN`.
3. **Integrações → Webhooks → Adicionar:**
   - URL: `https://<endereço-do-mecha-api>/api/asaas/webhook` (direto no Render: pela Vercel o proxy pede login e responde 401).
   - Token de autenticação: o do passo 2.
   - Versão da API: v3. Tipo de envio: **Sequencial** (a ordem importa: pago antes de estornado).
   - Eventos: todos de **Cobranças** (`PAYMENT_*`) e de **Assinaturas** (`SUBSCRIPTION_*`).
4. Testar: assinar no site com Pix → o QR Code aparece no próprio modal → no Sandbox, abrir a cobrança e
   "Confirmar pagamento" → em segundos o modal fecha e o plano vira Pro.
   Cartão: preencher no modal com um cartão de teste do Sandbox (docs.asaas.com → "Testando pagamento com cartão de
   crédito"); o Asaas cobra na hora e o plano vira Pro quando o aviso chega.
5. **Produção:** só depois do Sandbox validado. Conta aprovada no asaas.com, chave nova (`$aact_prod_…`),
   `ASAAS_AMBIENTE=producao` e um webhook novo na conta de produção (a configuração do Sandbox não passa sozinha).
   Pedir ao atendimento do Asaas a **tokenização** na conta de produção: sem ela, trocar de plano quem paga no
   cartão pode ser recusado.

**Atenção com o plano grátis do Render:** a API dorme depois de 15 minutos parada. O primeiro aviso do Asaas pode
chegar com a API acordando e dar tempo esgotado; o Asaas tenta de novo, mas depois de 15 falhas seguidas ele **pausa a
fila de webhooks** (reativar em Integrações → Webhooks). Antes de cobrar gente de verdade, passar a API para um plano
que não dorme.
