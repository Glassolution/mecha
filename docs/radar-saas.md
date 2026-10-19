# Prompt — Radar de SaaS no TikTok

> Transcrito do PDF "Prompt — Radar de SaaS no TikTok" (19/10/2026, Felipe Xavier). As seções marcadas "igual ao Faro" remetem a [faro-original.md](faro-original.md). Decisões tomadas depois estão em [decisoes.md](decisoes.md) e valem sobre este texto.

## Veredito: dá para fazer, com três mudanças de fundo

A ideia é viável. Vídeos orgânicos do TikTok por palavra-chave, com views, curtidas e transcrição, saem hoje por provedores de dados (Apify — TikTok Scraper com transcrição). O Creative Center tem filtro de indústria que inclui apps e software. O caminho oficial está fechado: a Research API do TikTok exclui uso comercial.

| O que muda | No Faro | No Radar de SaaS | Por quê |
|---|---|---|---|
| Unidade | O vídeo | A ideia (o SaaS), que junta vários vídeos | Quem procura ideia quer "o que está em alta", não um vídeo solto |
| Fonte da verdade | A capa | A transcrição + legenda | SaaS se explica falando; a capa quase nunca diz qual é o produto |
| Prova | Dias no ar | Views + velocidade (crescimento em 7 dias) | Não dá para ver faturamento; dá para ver atenção subindo |

Riscos que não somem:

- **Provedor de dados terceiro:** sem API oficial, o produto depende de raspagem por terceiros. Precisa de advogado antes de cobrar e de 2 provedores trocáveis.
- **"Vende" é inferência:** views provam interesse, não receita. A tela sempre diz "em alta", nunca "fatura X".
- **Vídeo de lista** ("5 ferramentas de IA que…") tem vários SaaS. O extrator precisa tirar todos, cada um com o trecho em que aparece.

O ângulo mais forte para o Brasil: ideias que bombam em inglês e ainda não têm versão em português. Entrou como prateleira própria (seção 8).

## 1. Papel e missão

Você é o engenheiro principal e o designer de produto do [PREENCHER: nome], um SaaS brasileiro que acha as ideias de SaaS que estão em alta nos vídeos curtos e mostra por quê. Leia o prompt inteiro antes de escrever código.

A promessa: "Em 1 minuto, as ideias de SaaS que estão bombando no seu nicho. Em 5, o plano da sua."

O que você vai construir:

1. Um site (web app) com login, uma lateral de abas e um fluxo ao vivo.
2. Um servidor com API, fila de tarefas e trabalhadores que coletam vídeos, transcrevem, extraem os SaaS citados e agrupam por ideia, sem ninguém no computador.
3. Uma biblioteca compartilhada: cada vídeo é avaliado uma vez, cada SaaS vira uma ficha única, e tudo serve para todas as contas.
4. Uma extensão do Chrome, opcional, para o TikTok Ads e para salvar vídeos enquanto a pessoa navega.

Como trabalhar:

- Construa uma fase por vez (seção 15). Antes de cada fase, devolva o plano em até 15 passos e espere o ok.
- Teste cada critério de "pronto quando" antes de seguir.
- Nunca invente números na tela. Dado de exemplo aparece marcado como exemplo.
- Nunca mostre faturamento de um SaaS que não veio de fonte pública citada.
- Toda a interface em português do Brasil, frases curtas, sem jargão. As perguntas do avaliador (seção 6) ficam em inglês.
- Quem usa é fundador ou marqueteiro, não necessariamente programador. Nenhuma tela pede chave, terminal ou API.

## 2. O produto

Quem entra não quer ver vídeo; quer decidir o que construir ou como divulgar. Toda tela termina numa ação: salvar a ideia, abrir o SaaS, copiar o gancho, gerar o plano da ideia ou o roteiro do vídeo.

| Quem | Modo | O que quer ver |
|---|---|---|
| Fundador, indie hacker, vibe coder | Achar ideia | SaaS que estão ganhando atenção agora, por nicho (ex.: medicina), com o problema que resolvem |
| Dono de SaaS, marqueteiro | Achar criativo | Vídeos que fazem software parecer irresistível, para refazer com o próprio produto |
| Agência e aceleradora (fase 3) | Os dois | Várias contas, relatórios de nicho, alertas |

Onde o produto se diferencia: espiões de anúncio mostram o vídeo; o [PREENCHER: nome] diz qual SaaS está no vídeo, junta todos os vídeos dele, mede se a atenção está subindo e responde "isso já existe no Brasil?".

Regras de produto (valem para todas as telas):

1. Simples ao extremo: pouco texto, um começo claro e um único botão em destaque por tela.
2. Sem ordem obrigatória: qualquer aba abre a qualquer hora.
3. Voltar em toda tela: cada tela tem endereço próprio.
4. Todo processo longo tem Parar, e o que já chegou fica.
5. "Em alta de acordo com o quê?": o filtro aparece onde há veredito, e cada ideia mostra ✓ ou ✗ por critério.
6. Fonte que não funciona aparece com cadeado e o motivo.
7. Apresentável: mosaico de vídeos, números que sobem, vídeo tocando ao passar o mouse.
8. Não empilhar recursos: pedido novo entra numa aba existente.
9. Honestidade de sinal: "em alta" = atenção medida; nunca "fatura", "lucra" ou "dá dinheiro" sem fonte.

O que não construir:

- Nada que edite o vídeo de outra pessoa ou marca. O Estúdio sempre cria texto e vídeo novos.
- Nenhum campo de chave, API ou nome de fornecedor de IA na tela.
- Nenhum login automático em conta de terceiros, nenhuma raspagem agressiva.
- Nenhuma cópia permanente de vídeo de terceiros: guardamos capa, dados, transcrição resumida e link.
- Nenhum "clone" de SaaS com nome, marca ou tela do original: o plano da ideia descreve o problema e o espaço, não copia o produto.

## 3. Arquitetura e stack

Igual ao Faro, com um passo a mais na fila: transcrever e extrair os SaaS de cada vídeo, e um trabalhador periódico que recalcula a tendência de cada ideia.

| Peça | Escolha | Por quê |
|---|---|---|
| Site | Next.js (React, TypeScript) em [PREENCHER: Vercel] | Rotas por endereço, página pública rápida |
| API | FastAPI (Python 3.12) | Coletores, extrator e nota em Python |
| Fila e trabalhadores | Redis + arq em [PREENCHER: Railway ou Fly] | Uma tarefa por passo: coletar, transcrever, extrair, perguntar ao Jev, agrupar, recalcular tendência |
| Banco | PostgreSQL + pgvector em [PREENCHER: Neon ou Supabase] | Biblioteca compartilhada e busca por semelhança (agrupar ideias parecidas) |
| Armazenamento | Cloudflare R2 | Capas, exportações e vídeos gerados |
| Login | Google (OAuth) e link mágico em [PREENCHER: Resend] | Sem senha |
| Ao vivo | SSE + Redis pub/sub | O garimpo mostra cada vídeo e cada SaaS chegando |
| Cobrança | Stripe | Seção 11 |

- Tarefas idempotentes, espera exponencial, cada tarefa carrega o id do garimpo e para quando ele é parado.
- Paralelismo: 8 extrações ao mesmo tempo; uma página por vez em cada fonte.
- Tarefa periódica `tendencia_diaria` (1x por dia): reconsulta views das ideias ativas e recalcula a velocidade (seção 7).
- Logs sem chaves nem e-mails. Por garimpo: vistos, transcritos, SaaS extraídos, ideias novas, custo de IA e tempo.

## 4. Modelo de dados

Três metades agora: vídeos (como no Faro), SaaS e ideias (novas), e os dados de cada conta. Ponto de partida:

```sql
-- biblioteca: vídeos (mesma tabela do Faro, com transcrição)
create table videos (
  id text primary key,           -- 'tt:<id>', 'yt:<id>', 'tta:<id>', 'meta:<id>', 'ig:<id>'
  fonte text not null,           -- tiktok | youtube | tiktok_ads | meta_ads | instagram
  tipo_item text not null,       -- post | anuncio
  idioma text, autor text, autor_seguidores bigint,
  texto text, hashtags text[] default '{}', termos text[] default '{}',
  transcricao text,              -- da legenda da plataforma ou do provedor; cortada em 4.000 caracteres
  capa_path text, video_url text, url_original text not null,
  views bigint, likes bigint, comentarios bigint, compartilhamentos bigint, salvamentos bigint,
  dias_no_ar int, ativo boolean, ctr numeric, objetivo text, setor text,
  duracao_s int, largura int, altura int, vertical boolean,
  descricao_visual text,
  publicado timestamptz, visto_primeiro timestamptz default now(), visto_ultimo timestamptz default now()
);

create table metricas_hist (     -- uma foto por dia, para medir velocidade
  video_id text references videos(id), dia date, views bigint, likes bigint,
  primary key (video_id, dia)
);

-- biblioteca: SaaS citados
create table saas (
  id uuid primary key,
  nome text not null,
  dominio text unique,           -- domínio normalizado é a chave de junção
  resumo_pt text,                -- o que faz, em 1 frase
  problema text, publico text,
  nicho text,                    -- uma das chaves de NICHOS (seção 6)
  modelo text,                   -- assinatura | uso | freemium | unico | desconhecido
  preco_visto text,              -- só se aparecer no vídeo ou na página pública
  tem_versao_br boolean,         -- null = não verificado
  embedding vector(1024),
  criado_em timestamptz default now()
);

create table video_saas (        -- um vídeo pode citar vários SaaS
  video_id text references videos(id), saas_id uuid references saas(id),
  papel text,                    -- principal | lista | comparacao | mencao
  trecho text, inicio_s int, confianca int,
  primary key (video_id, saas_id)
);

create table ideias (            -- o agrupamento: SaaS diferentes que resolvem o mesmo problema
  id uuid primary key, titulo_pt text, problema text, nicho text,
  saas_ids uuid[], videos int, views_total bigint,
  velocidade numeric, nota int, embedding vector(1024),
  atualizado_em timestamptz default now()
);

create table avaliacoes (
  video_id text primary key references videos(id),
  notas jsonb,                   -- {hook_forte, demo_clara, prova_social, pessoa_natural}: 0-100
  formato text, gancho text, gancho_pt text, gancho_tipo text,
  replica jsonb,                 -- {produto_trocavel, pessoa_trocavel, cenario_simples, livre_de_marca}
  prova int, criativo int, nota int,
  versao_perguntas text not null, avaliado_em timestamptz default now()
);

create table busca_cache (termo text, fonte text, idioma text, buscado_em timestamptz, video_ids text[], primary key (termo, fonte, idioma));
```

As tabelas de conta ficam como no Faro (contas, lojas vira **espacos**, membros, garimpos, garimpo_videos, colecoes, salvos, uso), com estas trocas:

- `espacos.vende` vira `espacos.interesse`: achar_ideia | achar_criativo, e `espacos.nichos text[]`.
- `produtos` vira `meus_saas` (nome, link, o que faz, público, preço), usado no modo Achar criativo.
- `salvos` aceita vídeo ou ideia: `salvos(colecao_id, item_tipo, item_id)`.
- `estudio_saidas.tipo`: plano_ideia | ganchos | roteiro | video.

Regras: as do Faro valem (envio parcial nunca apaga campo; reavaliar só quando versao_perguntas muda; veredito calculado na hora). E mais: um SaaS só é criado quando há nome e domínio ou link verificável; sem isso, fica só no trecho do vídeo.

## 5. Fontes e coleta

O TikTok orgânico vira a fonte principal (no Faro era fase 3). Todo item termina na tabela videos com o id prefixado.

| Fonte | Como coleta | Id | Prova | Fase |
|---|---|---|---|---|
| TikTok orgânico | Provedor de dados [PREENCHER: provedor principal + reserva], por palavra e hashtag, com transcrição | tt:<id> | views, compartilhamentos, salvamentos | 1 |
| YouTube Shorts | YouTube Data API v3, nossa chave (igual ao Faro) | yt:<id> | views | 1 |
| TikTok Ads (Creative Center) | Extensão do Chrome (seção 10), indústria de apps/software/educação | tta:<id> | curtidas, CTR | 2 |
| Facebook e Instagram Ads | Provedor de dados [PREENCHER] | meta:<id> | dias no ar | 2 |
| Reels orgânico | Provedor de dados [PREENCHER] | ig:<id> | views | 3 |

Não usar a Research API do TikTok: ela é só para pesquisa acadêmica e proíbe uso comercial.

### TikTok orgânico

- Busca por palavra e pela hashtag equivalente, no país do idioma (pt→BR, en→US, es→MX).
- Campos: autor e seguidores, legenda, hashtags, views, curtidas, comentários, compartilhamentos, salvamentos, data, duração, medidas, capa, link e a transcrição da legenda da própria plataforma.
- Vídeo sem legenda da plataforma: transcrever com [PREENCHER: modelo de fala para texto] num arquivo temporário, que é apagado logo depois. *(Ver decisoes.md: por ora, sem transcrição própria.)*
- Toda noite, reconsultar as métricas dos vídeos com menos de 30 dias ligados a ideias ativas e gravar em metricas_hist.

### Palavras de partida (Ideias)

O garimpo sugere palavras por nicho, misturando o nicho com termos de software. Exemplos para medicina: "app para médicos", "ai for doctors", "medical saas", "prontuário com ia", "clinic software". Termos gerais que sempre rendem: "ai tool", "saas idea", "app that pays", "i built an app", "ferramenta de ia", "site que faz".

### Regras de toda coleta

As 6 regras do Faro valem iguais: cache de 7 dias por palavra, cada palavra só no idioma dela, Parar conferido antes de cada palavra, medição só pelo cabeçalho, ritmo de uma pessoa, escrita só no idioma do usuário. E mais:

7. Filtro de relevância barato antes da IA cara: vídeo cuja legenda + transcrição não tem nenhum sinal de software (app, site, tool, ferramenta, saas, ia, ai, link na bio, domínio .com/.ai/.io) não segue para a extração.

## 6. O avaliador e o extrator de SaaS

Cada vídeo novo passa uma única vez por quatro passos: extrair os SaaS, descrever a capa, perguntar ao Jev e agrupar em ideia. O passo 1 é o coração do produto e não existia no Faro.

1. **Extrair os SaaS** com a Claude API (SDK oficial anthropic), modelo em MODELO_EXTRACAO, padrão claude-opus-5-5, output_config.effort em low.
   - Entrada: legenda, hashtags, transcrição (até 4.000 caracteres), autor e a capa como bloco de imagem (o nome do app costuma aparecer na tela).
   - Saída estruturada por output_config.format:
     ```json
     {"fala_de_software": bool,
      "saas": [{"nome", "dominio" (ou null), "resumo_en", "problema_en", "publico_en",
                "nicho" (chave de NICHOS), "modelo", "preco_visto" (ou null),
                "papel", "trecho", "inicio_s", "confianca" 0-100}],
      "descricao_visual", "texto_tela"}
     ```
   - Instrução de sistema: "List every software product, app or SaaS that this short video shows or talks about. Only list a product when its name is said, written on screen or in the caption. Never guess a name or a domain; use null when the domain is not shown. A list video ('5 AI tools…') returns one item per tool."
   - Item com confianca < 60 ou sem nome não vira SaaS; fica só no trecho.
   - Domínio: normalizar (sem www, sem caminho). Sem domínio, buscar o nome na biblioteca por semelhança antes de criar um SaaS novo.
   - Garimpo ao vivo: chamadas diretas, 8 em paralelo. Reprocessamento em massa: Message Batches. Recusa: fallbacks: "default" com o beta server-side-fallback-2026-07-01; se recusar de novo, o vídeo sai da fila.
2. **Perguntar ao Jev** (TypeSafe), como no Faro: uma chamada por vídeo com ETIQUETAS, DETALHES e REPLICA. Estado: `{"visual": descricao_visual, "copy": legenda[:500], "speech": transcricao[:800], "product": nome do SaaS principal, "hook": gancho}`.
3. **Agrupar em ideia:** embedding de problema_en + publico_en; similaridade de cosseno ≥ 0,85 com uma ideia existente do mesmo nicho junta; senão, cria ideia nova com titulo_pt gerado pelo modelo de texto.
4. **Calcular a nota** (seção 7), gravar e mandar o evento avaliado ao fluxo.

O gancho continua copiado, nunca inventado: texto da tela; sem ele, a primeira frase da transcrição; até 160 caracteres. Não-português ganha gancho_pt.

As perguntas (ficam em inglês; versao_perguntas = hash delas):

```python
ETIQUETAS = {
  "hook_forte": {"type": "score",
    "instructions": "How strongly would this video stop someone scrolling in the first second, judging by the first frame in `visual` and the opening of `speech` and `copy`?",
    "criteria": ["Nothing to stop for: a generic screen recording or a flat opening.",
                 "Weak: names the tool with no tension, question or surprise.",
                 "Moderate: a clear benefit ('saves you hours'), nothing surprising.",
                 "Strong: a specific curiosity gap, a bold claim, a money or time result, or a relatable pain right away.",
                 "Irresistible: an unexpected reveal ('this AI does my job'), a dramatic before-and-after or a striking number in the first second."]},
  "demo_clara": {"type": "score",
    "instructions": "How clearly does the video show the software actually working, judging by `visual` and `speech`?",
    "criteria": ["The software is never shown; only talk or stock footage.",
                 "A logo or a landing page appears, but no real use.",
                 "Some screens appear, but it is hard to follow what the tool does.",
                 "A clear screen recording shows the main action from input to result.",
                 "A crisp, fast demo where the result is obvious and impressive within seconds."]},
  "prova_social": {"type": "score",
    "instructions": "How much proof does the video give that people use or pay for this product, judging by `speech`, `copy` and `visual`?",
    "criteria": ["No proof at all.",
                 "Vague claims ('everyone is using this').",
                 "One concrete claim without evidence (a user count or a revenue number said out loud).",
                 "Visible evidence: a dashboard, reviews, a revenue screen or a known customer.",
                 "Strong, specific evidence from the creator's own use, with numbers shown on screen."]},
  "pessoa_natural": {"type": "score",
    "instructions": "How much does the video look like natural content from a real person rather than a polished brand ad?",
    "criteria": ["A fully produced brand ad or an animation with no person.",
                 "Mostly produced, with a presenter in a studio.",
                 "Mixed: a real person but a scripted, polished feel.",
                 "A real creator talking to the phone camera with a screen recording.",
                 "Fully natural: someone casually sharing a tool they actually use."]},
}

FORMATOS = {
  "tela_com_rosto": "A person talks over or next to a screen recording (green screen, picture-in-picture).",
  "so_tela": "Only a screen recording or a demo of the software, no person on camera.",
  "lista": "A list of several tools ('5 AI tools you need').",
  "historia_fundador": "A founder or builder tells how they built or grew the product.",
  "antes_depois": "A before-and-after: the task done the old way, then with the tool.",
  "reacao": "Someone reacts to or reviews the tool.",
  "anuncio_produzido": "A polished brand ad, animation or motion graphic.",
  "outro": "None of the above, or unclear.",
}

NICHOS = {  # chave -> (rótulo na tela, descrição para o modelo)
  "saude": ("Saúde e medicina", "Clinics, doctors, patients, health records, telemedicine, mental health, fitness tracking."),
  "educacao": ("Educação", "Studying, teachers, courses, tutoring, language learning."),
  "financas": ("Finanças", "Personal finance, accounting, invoicing, taxes, investing."),
  "vendas_marketing": ("Vendas e marketing", "Sales, CRM, ads, social media, SEO, email."),
  "conteudo": ("Criação de conteúdo", "Video, image, writing, thumbnails, podcasts, editing."),
  "produtividade": ("Produtividade", "Notes, tasks, calendar, meetings, documents, automation."),
  "dev": ("Programação e no-code", "Coding, app builders, websites, developer tools."),
  "juridico": ("Jurídico", "Lawyers, contracts, compliance."),
  "imobiliario": ("Imobiliário", "Real estate agents, rentals, property management."),
  "ecommerce": ("E-commerce", "Online stores, dropshipping, marketplaces, product research."),
  "rh": ("RH e carreira", "Hiring, resumes, job search, team management."),
  "servicos_locais": ("Negócios locais", "Restaurants, salons, gyms, booking and local service businesses."),
  "vida_pessoal": ("Vida pessoal", "Dating, travel, cooking, parenting, hobbies."),
  "outro": ("Outros", "Anything else."),
}

TIPOS_GANCHO = {  # os 7 do Faro, mais:
  "revelacao": "Reveals a hidden or little-known tool ('nobody talks about this site').",
  "numero": "Leads with a specific number of money, time or users.",
}

DETALHES = {
  "formato": {"type": "choice", "criteria": FORMATOS,
              "instructions": "Which format best describes the video in `visual` and `speech`?"},
  "gancho_tipo": {"type": "choice", "criteria": TIPOS_GANCHO,
                  "instructions": "What kind of hook is the opening line in `hook`?"},
}

REPLICA = {  # modo Achar criativo; corte 60. Igual ao Faro, trocando 'product' por 'software'.
  "produto_trocavel": {"type": "score",
    "instructions": "Could this video be remade with a different software product in place of the one shown, keeping the same structure?",
    "criteria": ["Depends on this exact product or brand.",
                 "Hard: the product's unique feature is the whole video.",
                 "Possible with changes.",
                 "Easy: the structure works for any tool that solves a similar problem.",
                 "Trivial: any software could fill this template."]},
  "pessoa_trocavel": {...},   # igual ao Faro
  "cenario_simples": {...},   # igual ao Faro
  "livre_de_marca": {...},    # igual ao Faro
}
```

## 7. Nota, tendência e filtro

Há duas notas: a do vídeo (como no Faro) e a da ideia (nova), que é o que o modo Achar ideia ordena. O veredito do filtro continua calculado na hora e mostra ✓ ou ✗ por critério.

```js
CRITERIOS_PADRAO = { modo: "ideia", atencao: "media", tendencia: "subindo", nichos: [], autores_min: 2, sem_br: false, modelo: "qualquer" }
PRESET_MODO = { ideia: { atencao: "media", tendencia: "subindo" }, criativo: { prova: "media", gancho: "forte" } }
```

### Nota do vídeo

Prova de vídeo orgânico (a do Faro), com +10 quando (compartilhamentos + salvamentos) / views ≥ 1% — quem salva vídeo de ferramenta pretende usar:

`prova = 20 · log10(views) − 50`

Anúncios (Meta e TikTok Ads) usam as fórmulas do Faro. Criativo pesa a demonstração, porque software que não aparece funcionando não convence:

`criativo = 0,4 · hook_forte + 0,3 · demo_clara + 0,15 · prova_social + 0,15 · pessoa_natural`

nota do vídeo = (prova + criativo) / 2, arredondada, limitada a 0–100.

### Nota da ideia

Três sinais, cada um de 0 a 100: atenção total, velocidade e diversidade de autores (muitos criadores diferentes falando do mesmo problema vale mais que um viral isolado ou autopromoção).

- `atencao = 20 · log10(views_total) − 60`
- `crescimento = Δviews_7d / views_há_7_dias`; `vel = 100 · min(1, crescimento / 0,5)`
- `div = 25 · log2(1 + autores)`
- `nota_ideia = 0,4 · atencao + 0,35 · vel + 0,25 · div`

Ideia com menos de 3 vídeos ou sem 7 dias de histórico mostra a velocidade como ⏱ "medindo" e não entra em "Explodindo".

### Critérios do filtro

| Critério | Leve / Subindo | Média | Forte / Explodindo |
|---|---|---|---|
| Atenção (views somadas da ideia) | 200 mil | 1 milhão | 5 milhões |
| Tendência (crescimento em 7 dias) | qualquer alta | +20% | +50% |

- Autores: no mínimo 2 criadores diferentes (padrão). Vídeos do próprio dono do SaaS contam como 1 autor.
- Nicho: lista vazia = todos.
- Sem versão no Brasil: exige tem_versao_br = false (verificado, seção 9). Null não passa.
- Modelo: assinatura, freemium, uso, qualquer.
- Modo Achar criativo: os critérios do Faro (prova, gancho ≥ 70, formatos, vertical, 4–60 s, produto_trocavel, pessoa_trocavel, livre_de_marca ≥ 60) e mais demo_clara ≥ 60.
- `avalia(item, criterios)` devolve `{passa, itens: [{k, ok: true | false | null, txt}]}`, para vídeo e para ideia.

## 8. Telas e navegação

A moldura é a do Faro (barra escura, lateral com cinco abas, área clara). Muda o que há dentro: a lateral passa a ser **Início, Ideias, Garimpo, Salvos e Estúdio**.

Rotas: /inicio, /ideias, /ideia/:id, /garimpo, /garimpo/:id, /salvos, /salvos/:colecao, /estudio, /video/:id, /saas/:id, /entrar, /boas-vindas, /config.

Busca do topo: "Buscar ideia, SaaS ou nicho" (⌘K).

### Entrada (/boas-vindas)

Três perguntas, uma por tela: "O que você quer?" (Achar uma ideia para construir · Divulgar o meu SaaS); "Quais nichos te interessam?" (os 14 de NICHOS, vários); "País e idioma" (Brasil e português marcados; "ver também o que bomba em inglês" ligado por padrão). Abre o Início com "As 20 ideias em alta em <nicho>", sem esperar.

### Início

- Pílula: "12 ideias novas em Saúde e medicina esta semana · Ver".
- Caixa grande: "Um nicho ou problema. Ex.: medicina, advogados, agenda de salão", com os chips Achar ideia e Achar criativo, e o botão que abre um garimpo.
- Cartões de próximo passo: as 20 em alta do nicho; "bombando lá fora, sem versão no Brasil"; continuar o último garimpo; transformar uma ideia salva em plano.

### Ideias (substitui o Explorar)

- Filtros em chips: Nicho, Atenção, Tendência, Modelo, Idioma, Sem versão no Brasil.
- Prateleiras: "Explodindo esta semana" (vel), "Bombando lá fora, sem versão no Brasil", "Muitos criadores falando" (div), "Mais vistas de todos os tempos" (atenção).
- Cartão de ideia: título em português ("IA que escreve o prontuário enquanto o médico fala"), nicho, nota da ideia, a seta de tendência com o número ("+64% em 7 dias"), "8 vídeos · 5 criadores · 3,4 mi views" e um leque de 3 capas que tocam ao passar o mouse.
- No modo Achar criativo, a aba mostra a grade de vídeos 9:16 do Faro, ordenada pela nota do vídeo.
- Plano grátis: só as 20 primeiras; o resto desfocado com "Assinar o Pro".

### Ficha da ideia (/ideia/:id, página inteira)

- Título, problema em uma frase, para quem é, nicho.
- "Por que está em alta": uma linha por critério com ✓, ✗ ou ⏱ ("Atenção: 3,4 mi views", "Tendência: +64% em 7 dias", "Criadores: 5 diferentes").
- Gráfico de views por dia dos últimos 30 dias.
- Os SaaS desta ideia: nome, link, modelo, preço visto, "tem versão no Brasil?" (sim / não / não verificado).
- Os vídeos: o mosaico, com o trecho em que cada SaaS é citado.
- Botões: Salvar em…, Gerar o plano da ideia (destaque), Copiar resumo.

### Garimpo, Salvos, Ficha do vídeo, Configurações

Como no Faro, com estas trocas: o ao vivo mostra quatro números (achados → transcritos → com SaaS → ideias novas) e uma coluna "SaaS encontrados agora"; a ficha do vídeo mostra os SaaS citados com o trecho e o segundo; a planilha dos Salvos ganha as colunas SaaS, Domínio, Nicho, Ideia e Tendência.

## 9. Estúdio

O Estúdio tem duas portas, uma por modo. Achar ideia devolve o plano da ideia; Achar criativo devolve ganchos, roteiro e vídeo para o SaaS da pessoa, como no Faro.

### Plano da ideia (novo)

Entrada: a ideia, seus SaaS, os trechos dos vídeos e o nicho da pessoa. Modelo em MODELO_TEXTO, padrão claude-opus-5-5, effort medium, saída estruturada.

Instrução de sistema: "Você ajuda um empreendedor brasileiro a avaliar uma ideia de SaaS que está em alta em vídeos curtos. Use só o que está nos vídeos, nas páginas públicas dos SaaS e nas buscas feitas. Não invente faturamento, número de usuários nem preço. Quando um dado não existir, diga 'não encontrado'. Descreva o problema e o espaço; nunca proponha copiar nome, marca, telas ou textos de um produto existente."

Saída:

```json
{"problema", "para_quem", "por_que_agora" (com os números de atenção e tendência),
 "quem_ja_faz": [{"nome", "link", "preco_visto", "no_brasil"}],
 "brecha_brasil", "versao_minima": [até 5 funções],
 "como_divulgar": [3 formatos que mais aparecem nos vídeos da ideia],
 "riscos": [], "perguntas_para_validar": [5]}
```

Verificação "tem versão no Brasil?": tarefa separada que usa a ferramenta de busca na web da Claude API com 2 a 3 buscas em português (o problema + "app", o nome do SaaS + "brasil"). Grava tem_versao_br só com link de prova; sem prova, fica null ("não verificado").

### Ganchos, roteiro e vídeo (modo Achar criativo)

Iguais ao Faro, trocando "produto" por "o SaaS da pessoa" (meus_saas). O roteiro tem uma parte a mais, demo_na_tela (o que gravar na tela do software), e nunca mostra a tela do SaaS da referência.

Nunca: editar o vídeo da referência; usar rosto, voz ou nome de pessoa real; usar nome, logo ou tela de outro SaaS no material da pessoa; afirmar faturamento ou resultado que não veio de fonte pública citada.

## 10. Extensão do Chrome

Igual à seção 10 do Faro (Manifest V3, pareamento por código de 6 dígitos, token só para /api/ext/*, coleta do Creative Center pelos cabeçalhos assinados, botão Salvar). Três trocas:

- No Creative Center, o pedido filtra a indústria de apps e software (a chave industry copiada da URL depois de aplicar o filtro na tela) e o objetivo de instalação de app ou conversão. Período de 180 dias.
- O botão Salvar também aparece em vídeos orgânicos do TikTok e do YouTube Shorts e lê a legenda visível; a transcrição vem depois, pelo servidor.
- Sem login no TikTok for Business, o TikTok Ads aparece com cadeado e o motivo. Isso não afeta o TikTok orgânico, que vem pelo provedor (fase 1).

Limites iguais: só páginas que a pessoa abriu ou o pedido que ela criou; ritmo humano; nunca digita senha; nunca lê dados da conta dela.

## 11. Planos e cobrança

O custo agora está em três lugares: provedor de dados, transcrição e extração. O limite fica no garimpo e no plano da ideia; navegar pelas Ideias só lê a biblioteca. Preços são ponto de partida.

| Plano | Preço | Ideias | Garimpos/mês | Planos da ideia/mês | Estúdio criativo | Alertas | Contas |
|---|---|---|---|---|---|---|---|
| Grátis | R$ 0 | as 20 em alta do nicho | 3 | 1 | 3 roteiros | não | 1 |
| Pro | [PREENCHER: R$ 97]/mês | todas | 40 | 20 | sem limite | 3 nichos | 1 |
| Agência | [PREENCHER: R$ 297]/mês | todas | 150 | 100 | sem limite | sem limite | 5, com equipe |

Aplicação no servidor, cobrança pelo Stripe, tolerância de 3 dias e uso zerando na renovação: tudo igual ao Faro. `uso` ganha a coluna `planos_ideia`.

## 12. Design

Mantenha a seção 12 do Faro inteira (tokens de cor claro/escuro, Space Grotesk, Inter, IBM Plex Mono, componentes, movimento, acessibilidade, quebra em 820 px). Para não parecer o mesmo produto, troque só a cor de destaque [PREENCHER: decidir]: sugestão --marca: #7c5cff (violeta, associado a software) com --on-marca: #ffffff, --marca-texto: #5a3fd6 no claro e #b3a1ff no escuro, --marca-suave: #efeaff / #7c5cff14.

*(Substituído: ver decisoes.md — preto e branco, estilo Mobbin.)*

Componentes novos:

- Cartão de ideia: leque de 3 capas no topo, título em Space Grotesk, a seta de tendência em mono com a cor --ok quando sobe, a nota num selo de destaque.
- Linha de SaaS: favicon do domínio, nome, modelo, preço visto e o selo "no Brasil" (sim / não / ?).
- Gráfico de tendência: linha fina de 30 dias, sem eixos poluídos, último ponto marcado.

## 13. API

Todas as rotas da seção 13 do Faro continuam, com loja lida como espaco e produtos como meus-saas. Rotas novas ou trocadas:

| Grupo | Rota | O que faz |
|---|---|---|
| Ideias | GET /api/ideias?nicho=&atencao=&tendencia=&modelo=&idioma=&sem_br=&prateleira=&cursor= | Ideias com o veredito por critério (substitui /api/explorar no modo ideia) |
| Ideias | GET /api/ideias/:id | A ficha: ideia, SaaS, vídeos, série de 30 dias e avalia() |
| SaaS | GET /api/saas/:id | O SaaS, os vídeos que o citam e a ideia a que pertence |
| SaaS | POST /api/saas/:id/verificar-br | Tarefa da verificação "tem versão no Brasil?" |
| Estúdio | POST /api/estudio | {ideia_id \| video_id, meu_saas_id?, tipo} → {id}; tipo plano_ideia confere o limite |
| Alertas | GET, POST, DELETE /api/alertas | Nichos vigiados (fase 3) |

O fluxo ao vivo ganha dois eventos: `saas {video_id, saas: [...]}` quando a extração termina, e `ideia {id, titulo_pt, nova: bool}` quando o agrupamento cria ou atualiza uma ideia.

## 14. Regras e cuidados

As 11 regras do Faro valem. Ajustes e regras novas:

1. Fonte do TikTok orgânico: dois provedores trocáveis atrás da mesma interface (ColetorTikTok), para que um bloqueio não derrube o produto. Os termos de cada provedor e o uso de dados públicos passam por advogado antes de cobrar [PREENCHER: data].
2. Transcrição é dado de terceiro: guardar no máximo 4.000 caracteres para busca e extração; na tela, só o trecho em que o SaaS é citado (até 2 frases) e o link para o vídeo.
3. Sinal, não faturamento: nenhuma tela, texto gerado ou e-mail afirma receita, lucro ou número de clientes de um SaaS sem link para fonte pública. Número dito no vídeo aparece como "segundo o vídeo".
4. Nada de clone: o plano da ideia nunca sugere usar nome, marca, logo, telas ou textos de outro SaaS.
5. Pessoas nos vídeos: autor é exibido como está na plataforma (público). Não montar perfil de criador fora do que a plataforma mostra.
6. Chaves só no servidor: as do Faro, mais a do provedor de TikTok e a de transcrição.
7. TypeSafe: o Jev é citado no prompt original do Faro; confirmar uso comercial e preço antes da primeira cobrança, ou trocar as perguntas de score por saída estruturada da Claude API.

## 15. Ordem de construção

Uma fase por vez; só passa com todos os testes marcados, em banco e fila de teste à parte.

Fase 0 · Validar antes de codar

- [ ] Nome, INPI e domínio conferidos.
- [ ] Provedor de TikTok testado: 3 palavras ("ai for doctors", "saas idea", "app para médicos") trazem views e transcrição em pelo menos 70% dos vídeos.
- [ ] Extrator rodado à mão em 100 vídeos: acerta o nome do SaaS em 85% ou mais, sem inventar domínio.
- [ ] Custo por vídeo (provedor + transcrição + extração + Jev) medido nesse lote.
- [ ] 10 fundadores viram 20 ideias de exemplo e 3 disseram que pagariam.

Fase 1 · Ideias e Garimpo (TikTok orgânico + YouTube Shorts)

- [ ] Garimpo inicial de 60 palavras (5 por nicho) roda sozinho e enche a biblioteca antes do lançamento. Não há biblioteca herdada, como no Faro.
- [ ] Conta nova responde as três perguntas e vê as 20 ideias em alta do nicho em menos de 1 minuto.
- [ ] Vídeo de lista com 5 ferramentas gera 5 linhas em video_saas.
- [ ] Dois vídeos de criadores diferentes sobre o mesmo problema caem na mesma ideia.
- [ ] Ideia com menos de 7 dias de histórico mostra ⏱ na tendência.
- [ ] O plano grátis bloqueia o 4º garimpo no servidor (402).
- [ ] Celular de 375 px sem rolagem lateral; console sem erros.

Fase 2 · Estúdio, extensão e anúncios

- [ ] Plano da ideia sai com "quem já faz" linkado e nenhum número sem fonte.
- [ ] Verificação "no Brasil" grava sim/não só com link de prova.
- [ ] Extensão traz TikTok Ads da indústria de apps; Meta Ads entra pelo provedor.
- [ ] Modo Achar criativo devolve 5 ganchos e um roteiro com demo_na_tela para o SaaS da pessoa.
- [ ] Stripe muda o plano na hora.

Fase 3 · Alertas e agência

- [ ] Alerta quando uma ideia do nicho vigiado passa de +50% em 7 dias.
- [ ] Vídeo com IA com custo mostrado, confirmação e crédito devolvido em falha.
- [ ] Plano Agência com 5 contas e equipe.
