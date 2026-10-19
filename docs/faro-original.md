# Prompt original do Faro (referência)

> Referência para as seções do Radar marcadas "igual ao Faro". Texto como foi enviado pelo dono, em 19/10/2026.

## 1. Papel e missão

Você é o engenheiro principal e o designer de produto do [PREENCHER: Faro], um SaaS brasileiro que acha os anúncios que já vendem no nicho do lojista e entrega o criativo dele pronto. Leia o prompt inteiro antes de escrever código.

A promessa: "Em 1 minuto, os anúncios que mais vendem no seu nicho. Em 5, o roteiro do seu."

O que você vai construir:

1. Um site (web app) com login, uma lateral de abas e um fluxo ao vivo.
2. Um servidor com API, fila de tarefas e trabalhadores que coletam e avaliam vídeos sozinhos, sem ninguém no computador.
3. Uma biblioteca compartilhada: cada vídeo é avaliado uma vez e serve para todas as contas.
4. Uma extensão do Chrome, opcional, para o TikTok Ads e para salvar anúncios enquanto a pessoa navega.

Como trabalhar:

- Construa uma fase por vez (seção 15). Antes de cada fase, devolva o plano em até 15 passos e espere o ok.
- Teste cada critério de "pronto quando" antes de seguir.
- Nunca invente números na tela. Dado de exemplo aparece marcado como exemplo.
- Toda a interface em português do Brasil, frases curtas, sem jargão. As perguntas do avaliador (seção 6) ficam em inglês, como estão.
- Quem usa é vendedor, não programador. Nenhuma tela pede chave, terminal ou API.

## 2. O produto

O vendedor não quer achar anúncio; ele quer vender. Por isso toda tela termina numa ação: salvar, baixar, copiar o gancho, gerar o roteiro ou o vídeo. Tela que só mostra não entra.

| Quem | Modo | O que quer ver |
|---|---|---|
| Lojista de Shopify e dropshipping | Para vender | Anúncios no ar há muito tempo, porque anúncio que não vende sai do ar |
| Vendedor e afiliado do TikTok Shop | Para replicar | Vídeos curtos e verticais, fáceis de refazer trocando o produto e a pessoa |
| Gestor de tráfego e agência (fase 3) | Os dois | Várias lojas na mesma conta, com equipe |

Onde o produto se diferencia: os espiões de anúncio mostram o anúncio; o [PREENCHER: Faro] diz quais servem para o objetivo do usuário, mostra por quê, critério por critério, e entrega o criativo dele.

Regras de produto (valem para todas as telas):

1. Simples ao extremo: pouco texto, um começo claro e um único botão em destaque por tela.
2. Sem ordem obrigatória: qualquer aba abre a qualquer hora. O produto do usuário é opcional para garimpar.
3. Voltar em toda tela: cada tela tem endereço próprio, e o voltar do navegador leva à tela anterior.
4. Todo processo longo tem Parar, e o que já chegou fica.
5. "Bom de acordo com o quê?": o filtro do usuário aparece onde há veredito, e cada vídeo mostra ✓ ou ✗ por critério.
6. Fonte que não funciona aparece com cadeado e o motivo, nunca como opção que falha.
7. Apresentável: o dono grava vídeos para o YouTube usando o produto. Mosaico de vídeos, números que sobem, vídeo tocando ao passar o mouse.
8. Não empilhar recursos: pedido novo entra numa aba existente.

O que não construir:

- Nada que edite o vídeo de outra marca (trocar o objeto ou a pessoa por cima do vídeo alheio). O Estúdio sempre cria vídeo novo.
- Nenhum campo de chave, API ou nome de fornecedor de IA na tela. Para o usuário, quem avalia é o [PREENCHER: Faro].
- Nenhum login automático em conta de terceiros, nenhuma raspagem agressiva.
- Nenhuma cópia permanente de vídeo de terceiros no nosso armazenamento: guardamos capa, dados e link.

## 3. Arquitetura e stack

A pessoa só fala com o site e, se quiser, com a extensão. Tudo o que demora vira tarefa na fila e roda nos trabalhadores, mesmo com o navegador dela fechado.

| Peça | Escolha | Por quê |
|---|---|---|
| Site | Next.js (React, TypeScript) em [PREENCHER: Vercel] | Rotas por endereço, página pública rápida, bom no celular |
| API | FastAPI (Python 3.12) | Reaproveita a lógica em Python do painel: coletores, avaliador, nota |
| Fila e trabalhadores | Redis + arq, trabalhadores em Python em [PREENCHER: Railway ou Fly] | Uma tarefa por passo: coletar uma palavra, descrever uma capa, perguntar ao Jev, medir, montar um zip, gerar no Estúdio |
| Banco | PostgreSQL em [PREENCHER: Neon ou Supabase] | A biblioteca compartilhada e as contas (seção 4) |
| Armazenamento | Cloudflare R2 (compatível com S3) | Capas, zips de 24 h e vídeos gerados |
| Login | Google (OAuth) e link mágico por e-mail em [PREENCHER: Resend] | Nenhuma senha para guardar |
| Ao vivo | SSE da API, alimentado por Redis pub/sub | O garimpo mostra cada vídeo chegando |
| Cobrança | Stripe | Seção 11 |

- Tarefas idempotentes: rodar duas vezes não duplica nada. Novas tentativas com espera exponencial; cada tarefa carrega o id do garimpo e para quando ele é parado.
- Paralelismo limitado: 8 avaliações ao mesmo tempo; uma página por vez em cada fonte.
- Logs sem chaves nem e-mails. Por garimpo, guarde vistos, avaliados, aprovados, custo de IA e tempo.

## 4. Modelo de dados

O banco tem duas metades: a biblioteca, compartilhada entre todas as contas (videos, avaliacoes, busca_cache), e os dados de cada loja (garimpos, salvos, produtos, estúdio, uso). Use PostgreSQL com o esquema abaixo como ponto de partida.

```sql
-- biblioteca compartilhada: um vídeo, uma linha, para todas as contas
create table videos (
  id text primary key,              -- 'meta:<id>', 'yt:<id>', 'tta:<id>', 'tt:<id>', 'ig:<id>'
  fonte text not null,              -- meta_ads | youtube | tiktok_ads | tiktok | instagram
  tipo_item text not null,          -- anuncio | post
  idioma text,                      -- pt | en | es
  anunciante text, loja_dominio text,
  texto text, hashtags text[] default '{}', termos text[] default '{}',
  capa_path text,                   -- nossa cópia da capa no armazenamento
  video_url text,                   -- link da fonte (expira; nunca copiamos o arquivo)
  url_original text not null,
  dias_no_ar int, inicio_veiculacao date, ativo boolean,
  views bigint, likes bigint, comentarios bigint,
  ctr numeric, orcamento text, objetivo text, setor text,   -- TikTok Ads
  duracao_s int, largura int, altura int, vertical boolean,
  descricao_visual text,            -- passo 1 do avaliador (seção 6)
  publicado timestamptz, visto_primeiro timestamptz default now(), visto_ultimo timestamptz default now()
);

create table avaliacoes (
  video_id text primary key references videos(id),
  notas jsonb,        -- {ugc_natural, hook_forte, visual_limpo, produto_bonito}: 0-100
  confianca jsonb, porque jsonb,
  formato text, categoria text, gancho text, gancho_pt text, gancho_tipo text,
  replica jsonb,      -- {produto_trocavel, pessoa_trocavel, cenario_simples, livre_de_marca}
  prova int, criativo int, nota int,   -- seção 7
  versao_perguntas text not null, avaliado_em timestamptz default now()
);

create table busca_cache (
  termo text, fonte text, idioma text, buscado_em timestamptz, video_ids text[],
  primary key (termo, fonte, idioma)
);

-- contas e lojas
create table contas (id uuid primary key, email text unique not null, nome text, criado_em timestamptz default now());
create table lojas (
  id uuid primary key, dono_id uuid references contas(id), nome text not null,
  vende text,            -- uma das 13 categorias (seção 7) ou 'fisico'
  link_produto text,
  onde_anuncia text,     -- meta | tiktok_shop | os_dois
  pais text default 'BR', idioma text default 'pt',
  plano text default 'gratis', criado_em timestamptz default now()
);
create table membros (loja_id uuid references lojas(id), conta_id uuid references contas(id), papel text, primary key (loja_id, conta_id));

-- o que cada loja faz
create table garimpos (
  id uuid primary key, loja_id uuid references lojas(id),
  termos text[], termos_idioma jsonb, fontes text[], idiomas text[],
  criterios jsonb,       -- o filtro (seção 7) no momento do garimpo
  status text,           -- aguardando | garimpando | concluido | parado | erro
  por_fonte jsonb,       -- {fonte: {status, termo, novos, detalhe}}
  vistos int default 0, aprovados int default 0,
  criado_em timestamptz default now(), fim_em timestamptz
);
create table garimpo_videos (garimpo_id uuid references garimpos(id), video_id text references videos(id), termo text, chegou_em timestamptz default now(), primary key (garimpo_id, video_id));
create table colecoes (id uuid primary key, loja_id uuid references lojas(id), nome text not null, criado_em timestamptz default now());
create table salvos (colecao_id uuid references colecoes(id), video_id text references videos(id), salvo_em timestamptz default now(), primary key (colecao_id, video_id));
create table produtos (id uuid primary key, loja_id uuid references lojas(id), nome text, foto_path text, link text, preco numeric, categoria text, entendimento jsonb);
create table estudio_saidas (
  id uuid primary key, loja_id uuid references lojas(id), video_id text references videos(id), produto_id uuid references produtos(id),
  tipo text,             -- ganchos | roteiro | video
  conteudo jsonb, status text, creditos int default 0, criado_em timestamptz default now()
);
create table uso (loja_id uuid references lojas(id), mes date, garimpos int default 0, creditos_video int default 0, downloads int default 0, primary key (loja_id, mes));
```

Regras:

- Envio parcial completa a linha e nunca apaga um campo que já tinha valor.
- Um vídeo que volta numa busca nova reaproveita a avaliação. Só se avalia de novo quando versao_perguntas muda.
- dias_no_ar, views e likes mudam com o tempo; visto_ultimo e ativo dizem se o anúncio continua no ar.
- O veredito do filtro (seção 7) é calculado na hora, a partir de criterios. Não se grava aprovado ou reprovado no vídeo.

## 5. Fontes e coleta

Cada fonte entra pelo caminho que ela permite, e todo item termina na mesma tabela videos, com o id prefixado pela fonte. Um coletor por fonte, cada um como tarefa da fila (seção 3).

| Fonte | Como coleta | Id | Prova | Fase |
|---|---|---|---|---|
| YouTube Shorts | YouTube Data API v3, com a nossa chave | yt:<videoId> | views | 1 |
| Facebook e Instagram (Biblioteca de Anúncios) | Provedor de dados [PREENCHER: provedor] | meta:<id da biblioteca> | dias no ar | 1 |
| TikTok Ads (Creative Center, Top Ads) | Extensão do Chrome, no login da pessoa (seção 10) | tta:<id> | curtidas | 2 |
| TikTok orgânico e Reels | Provedor de dados [PREENCHER: provedor] | tt:<id>, ig:<id> | views | 3 |

### YouTube Shorts

- Busca com search.list (100 unidades): part=snippet, type=video, videoDuration=short, order=viewCount, publishedAfter no começo do ano anterior, maxResults 15 a 25. relevanceLanguage e regionCode por idioma: pt→BR, en→US, es→MX.
- Detalhes com videos.list (1 unidade para até 50 ids): part=snippet,statistics,contentDetails,player e maxWidth=1000. embedWidth e embedHeight dizem se o vídeo é vertical; duration (ISO 8601) vira duracao_s.
- Idioma real = snippet.defaultAudioLanguage ou defaultLanguage. Vídeo que declara um idioma fora do pedido fica de fora.
- texto = título + descrição; url_original = https://www.youtube.com/shorts/<id>; capa = a maior thumbnail.
- Cota: 10 mil unidades por dia, cerca de 100 buscas. Peça aumento ao Google quando passar disso.

### Facebook e Instagram

- A API oficial da Meta só entrega anúncios políticos fora da Europa; anúncio de produto no Brasil vem pelo provedor.
- Filtros: país do idioma (BR para pt), só ativos, só vídeo, palavra-chave.
- Campos: anunciante e loja, data de início (vira dias_no_ar), texto, capa, video_url, url_original = https://www.facebook.com/ads/library/?id=<id>.
- As URLs de vídeo e capa expiram em cerca de 5 dias: copie a capa para o armazenamento na hora e guarde a descrição e as medidas.

### TikTok Ads

- Vem pela extensão (seção 10), período de 180 dias: com 30 dias quase não vem nada no Brasil.
- Cada anúncio traz like, ctr (percentil: 0,99 = top 99%), cost (orçamento 0, 1 ou 2), objective_key, industry_key e video_info (duração, largura, altura, capa e vídeo de 360p a 1080p).
- url_original = https://ads.tiktok.com/business/creativecenter/topads/<id>/pc/pt?countryCode=BR&period=180.

### Regras de toda coleta

1. Cache por palavra: uma palavra buscada na mesma fonte e idioma nos últimos 7 dias sai de busca_cache, sem gastar cota, provedor nem IA.
2. Cada palavra só no idioma dela. O garimpo traz termos_idioma; palavra digitada à mão tem o idioma adivinhado por pistas (ã, ç, "achadinho" → pt; "made me", "finds" → en; ñ, "cocina" → es). Sem certeza, busca nos idiomas do garimpo. Nunca cruze todas as palavras com todos os idiomas.
3. Parar: antes de cada palavra, o coletor confere o status do garimpo. Se for parado, sai sem mandar mais nada; o que já chegou fica.
4. Medição: vídeo sem largura, altura ou duração passa pelo ffprobe só no cabeçalho (-show_entries stream=width,height:stream_side_data=rotation:format=duration, -rw_timeout). Rotação de 90° troca largura por altura. Nada do vídeo é guardado.
5. Ritmo: poucas páginas por palavra, uma de cada vez, com pausa. Erro de uma fonte vira erro só nela, com o motivo; as outras seguem.
6. Escrita só no idioma do usuário: título em escrita não latina (árabe, tailandês, chinês…) fica de fora.

## 6. O avaliador

Cada vídeo novo passa uma única vez por três passos: o modelo de visão descreve a capa, o Jev responde às perguntas e o servidor calcula a nota (seção 7). O resultado fica em avaliacoes e serve para todas as contas. Para o usuário, quem avalia é o [PREENCHER: Faro].

1. Descrever a capa com a Claude API, pelo SDK oficial anthropic (o Jev lê texto, não vê imagem).
   - Modelo em MODELO_VISAO, padrão claude-opus-5-5, com output_config.effort em low.
   - Entrada: a capa como bloco de imagem (`{"type": "image", "source": {"type": "url", "url": "<capa>"}}`), mais o texto e o anunciante.
   - Saída estruturada por output_config.format (JSON Schema): descricao_visual (texto), texto_tela (texto ou nulo) e rotulo_tela (texto ou nulo).
   - A frase: uma só, em inglês, com o formato (talking to camera, demo, try-on, before-after, unboxing, graphic, skit/POV), o que aparece e o texto da tela entre aspas, caption '...'. Texto que é só um rótulo ("ABRE", "fone") vai como on-screen label '...', para não virar gancho.
   - Garimpo ao vivo: chamadas diretas, 8 em paralelo. Reavaliação em massa: Message Batches, que custa metade e não tem pressa.
   - Recusa (stop_reason igual a refusal): use fallbacks: "default" com o beta server-side-fallback-2026-07-01. Se ainda recusar, o vídeo fica sem avaliação e sai da fila.
2. Perguntar ao Jev (TypeSafe): uma chamada por vídeo novo com os três grupos juntos (ETIQUETAS, DETALHES, REPLICA), 8 em paralelo.
   - POST https://api.typesafe.ai/v1/systemone, cabeçalho Authorization: Bearer <TYPESAFE_API_KEY>, corpo `{"model": "jev-latest", "state": {...}, "questions": {...}}`.
   - Estado por vídeo: `{"visual": descricao_visual, "copy": texto[:500], "store": anunciante, "hook": gancho}`.
   - Respostas: score vira 0 a 100 com score / (N − 1) × 100, sendo N o número de critérios; noul é a probabilidade × 100; choice devolve a chave.
   - Tente de novo com espera exponencial em 429 e 5xx, até 6 vezes. Guarde as respostas em cache pelo hash de estado + perguntas.
3. Calcular a nota (seção 7), gravar em avaliacoes e mandar o evento avaliado ao fluxo ao vivo (seção 13).

O gancho é copiado, nunca inventado: é o texto da tela em caption '...'; sem ele, a primeira linha do texto do anúncio; no máximo 160 caracteres. Vídeo que não é em português ganha gancho_pt, traduzido pelo modelo de texto. Na tela, as hashtags saem do gancho.

Versão das perguntas: versao_perguntas é o hash dos dicionários abaixo. Mudou uma pergunta, os vídeos são reavaliados em segundo plano. Vídeo sem avaliação fica com os critérios em branco e nunca aparece como aprovado.

As perguntas, literais (ficam em inglês):

```python
ETIQUETAS = {
  "ugc_natural": {"type": "score",
    "instructions": "How much does the ad creative described in `visual` look like natural user-generated content made by an ordinary person, rather than a studio production, a model shoot, a graphic or a product-only shot? Strong signs of natural UGC: an ordinary person with a real, non-model body and look; filming at home, in the car or in the street; talking straight to the phone camera; casual, unpolished framing; native caption-style text. Promo badges lower it a little; a model body, a studio set or a designed layout lower it a lot.",
    "criteria": ["A graphic, a studio product shot, a TV-style piece or a polished model shoot, with no ordinary person on camera.",
                 "Mostly produced: a posed model, a store display, a branded set or a designed layout where a person is barely involved.",
                 "Mixed: a person on camera, but the scene looks staged or professional, or it is covered in promo overlays.",
                 "Clearly made by a real person with a phone: someone talking to the camera, trying on clothes or showing a product at home, in the car or in the street.",
                 "Fully natural: an ordinary person with a real, non-model body casually filming their own life, reaction or body, exactly like a friend's post."]},
  "hook_forte": {"type": "score",
    "instructions": "How strongly would this ad stop someone scrolling in the first second, judging by the first frame described in `visual` and the opening line of `copy`?",
    "criteria": ["Nothing to stop for: a blank, dark, blurry or generic first frame and a flat opening.",
                 "Weak: a plain product or person with no tension, question or surprise.",
                 "Moderate: a clear benefit or offer, but nothing surprising.",
                 "Strong: a specific curiosity gap, a bold claim, a relatable story or a visible transformation right away.",
                 "Irresistible: a striking image or line that creates instant curiosity or emotion, such as an unexpected confession or a dramatic before-and-after."]},
  "visual_limpo": {"type": "score", "instructions": "How clean and uncluttered is the ad creative described in `visual`?",
    "criteria": ["Very cluttered: several price badges, banners, stickers, emojis or blocks of text competing, or a chaotic scene.",
                 "Busy: big promo text or several overlays dominate the image.",
                 "Moderate: one caption or badge over a somewhat busy background.",
                 "Clean: at most one short caption and a single clear subject.",
                 "Very clean: no overlays or one minimal label, a single focal point and a calm background."]},
  "produto_bonito": {"type": "score", "instructions": "How attractive and desirable does the product look in the ad creative described in `visual`?",
    "criteria": ["The product is not visible, or it is unclear what is being sold.",
                 "The product appears small, blurry, badly lit or lost in the scene.",
                 "The product is visible and recognizable, but the presentation is ordinary.",
                 "The product is well framed and well lit, and it looks good.",
                 "The product is the beautiful hero of the frame: lighting, composition and styling make you want it."]},
}

FORMATOS = {
  "pessoa_falando": "A person talks straight to the camera (talking head, creator speaking, testimonial style).",
  "demonstracao": "Hands or a person show the product working (how it is used, cleaning or cooking demo).",
  "antes_depois": "A before-and-after comparison or a visible transformation is the core of the frame.",
  "unboxing": "Someone opens a package or box and reveals the product.",
  "provador": "Someone tries on clothing, shoes, shapewear or accessories (try-on, fit check, mirror).",
  "produto_destaque": "The product itself is the hero of the frame and nobody is talking (product shot, packshot).",
  "historia": "A skit, POV, story, humor or emotional scene carries the ad.",
  "arte_texto": "A designed graphic, banner, price card or text-heavy layout.",
  "outro": "None of the above, or the frame is unclear (blank, logo, scenery).",
}

CATEGORIAS = {  # chave -> (rótulo na tela, descrição para o Jev)
  "jewelry": ("Joias e acessórios", "Jewelry, watches, bags, sunglasses and fashion accessories."),
  "apparel": ("Roupas e calçados", "Clothing, lingerie, shapewear, swimwear and shoes."),
  "grooming": ("Aparadores e barbeadores", "Hair clippers, beard trimmers and shavers."),
  "beauty": ("Beleza e cosméticos", "Skincare, makeup, hair care, perfume and beauty devices."),
  "health": ("Suplementos e saúde", "Supplements, vitamins, medicines, health and orthopedic products."),
  "home": ("Casa e cozinha", "Home goods, kitchen tools, cleaning, organization, furniture and decor."),
  "electronics": ("Eletrônicos", "Phones, phone accessories, gadgets and electronic devices."),
  "kids": ("Infantil e brinquedos", "Toys, baby and children's products."),
  "sports": ("Esporte e fitness", "Sports, gym and fitness equipment and outdoor gear."),
  "pet": ("Pet", "Products for pets: food, beds, toys, grooming and pet health."),
  "car": ("Carro e moto", "Car and motorcycle parts and accessories."),
  "services": ("Serviços e cursos", "Physical stores advertising themselves, banks, apps, software, courses, services, real estate, events or recruitment."),
  "other": ("Outros produtos", "Any other physical product."),
}

TIPOS_GANCHO = {
  "curiosidade": "Creates curiosity or promises a secret to reveal.",
  "dor": "Names a pain, problem or frustration.",
  "resultado": "Shows or promises a result or transformation.",
  "oferta": "Leads with a price, discount, deal or free item.",
  "historia": "Opens a personal story or scene.",
  "pergunta": "Asks the viewer a direct question.",
  "polemica": "Makes a bold, controversial or contrarian claim.",
}

DETALHES = {
  "formato": {"type": "choice", "criteria": FORMATOS, "instructions": "Which format best describes the ad creative described in `visual`, given its `copy`?"},
  "categoria": {"type": "choice", "criteria": {k: d for k, (_, d) in CATEGORIAS.items()},
                "instructions": "What does the ad in `visual` and `copy` sell? Physical stores advertising themselves, banks, apps, courses and services count as services."},
  "gancho_tipo": {"type": "choice", "criteria": TIPOS_GANCHO, "instructions": "What kind of hook is the opening line in `hook`?"},
}

REPLICA = {  # modo Para replicar; corte 60
  "produto_trocavel": {"type": "score",
    "instructions": "Could this video be remade with a different product of the same kind in place of the one shown? Judge from `visual` and `copy`: is there one clear physical product that is the focus, shown in a way another product could take its place (held, used, placed, demonstrated)?",
    "criteria": ["No physical product, or a service, app, store, course or many different products.",
                 "A product appears but is tiny, hidden or one of many items; hard to swap.",
                 "One product is visible but shares focus with other things, or is built into the scene (furniture, the room itself).",
                 "One clear physical product is the focus and is shown in a way another product of the same kind could replace it.",
                 "One clear handheld or tabletop product is the hero of every shot: swapping it keeps the whole video working."]},
  "pessoa_trocavel": {"type": "score",
    "instructions": "Could the person in this video be replaced by a different ordinary creator without losing what makes it work? Judge from `visual` and `copy`.",
    "criteria": ["It depends on a celebrity, a famous influencer, a child, or a group or couple dynamic.",
                 "Several people interact, or the person's known face, character or persona is central.",
                 "One person, but their look or performance is very specific (costume, character, stunt).",
                 "One ordinary person talking or demonstrating; any creator of a similar profile could do it.",
                 "Only hands, or one ordinary person whose role any creator could perform."]},
  "cenario_simples": {"type": "score", "instructions": "How easy is it to recreate the setting of this video?",
    "criteria": ["An unusual or expensive location, an event, a crowd or a special vehicle.",
                 "A specific store, studio or outdoor place that takes effort to reproduce.",
                 "A normal place with some specific details.",
                 "A common room (kitchen, bathroom, bedroom, living room) or a car interior.",
                 "A plain background or a table: anyone can reproduce it at home."]},
  "livre_de_marca": {"type": "noul",
    "instructions": "Is the video free of famous brand logos, licensed characters, celebrities and recognizable copyrighted elements that would make it hard to remake?",
    "criteria": {"true": "No famous brand, licensed character or celebrity is central to the video.",
                 "false": "A famous brand logo, licensed character, celebrity or recognizable copyrighted element is central."}},
}
```

Relevância para o produto da pessoa (filtro "Combina com o meu produto" e Estúdio): pergunta mesmo_tipo (noul) com o texto "Does the ad in ad sell the same kind of product as product.type? Another brand or model of the same kind counts; an accessory, a related but different product, a service or anything in product.avoid does not." O valor combina = noul × 100, com corte em 60. Quando o produto muda, compara tudo de novo.

## 7. Nota e filtro

O usuário diz o que é um anúncio bom para ele; o filtro aplica isso a cada vídeo e mostra ✓ ou ✗ por critério. A nota só ordena as listas. O filtro padrão sai das três respostas do perfil.

```js
CRITERIOS_PADRAO = { modo: "vender", prova: "media", gancho: "forte", formatos: [], categoria: "fisico", meuProduto: false }
PRESET_MODO = { vender: { prova: "media", gancho: "forte" }, replicar: { prova: "leve", gancho: "qualquer" } }
```

Prova (quem paga anúncio por semanas está vendendo; vídeo orgânico prova com views; o TikTok Ads não informa dias no ar):

| Nível | Anúncio do Facebook | Vídeo orgânico | TikTok Ads |
|---|---|---|---|
| Leve | 14+ dias no ar | 50 mil views | 100 curtidas |
| Média | 60+ dias no ar | 200 mil views | 1 mil curtidas |
| Forte | 120+ dias no ar | 1 milhão de views | 10 mil curtidas |

Os outros critérios:

- Gancho forte: hook_forte ≥ 70.
- Produto: "fisico" (padrão) barra a categoria Serviços e cursos; uma categoria específica exige aquela categoria; "tudo" não filtra.
- Formatos: lista vazia quer dizer todos.
- Combina com o meu produto: só aparece com um produto cadastrado e exige combina ≥ 60 (seção 6).
- Modo Para replicar acrescenta cinco checagens: tela vertical; duração de 4 a 60 s (acima de 30 s, avisar que o vídeo com IA usa os primeiros 30 s); produto_trocavel, pessoa_trocavel e livre_de_marca, todos ≥ 60.
- avalia(video, criterios) devolve {passa, itens: [{k, ok: true | false | null, txt}]}. null quer dizer "falta avaliar" ou "medindo"; só passa quem tem tudo true.

A nota (0 a 100) é a média de prova e criativo, arredondada.

- Prova de anúncio do Facebook, com +10 quando o anunciante tem 3 ou mais anúncios na biblioteca: `prova = 25 · log2(1 + dias / 7)`
- Prova de vídeo orgânico, com +10 quando (curtidas + comentários) / views ≥ 3%: `prova = 20 · log10(views) − 50`
- Prova do TikTok Ads, com +10 quando o objetivo é venda ou conversão: `prova = 25 · log10(curtidas)`
- Criativo e nota final (prova limitada a 0–100): `criativo = 0,5 · hook_forte + 0,25 · max(ugc_natural, produto_bonito) + 0,25 · visual_limpo`; `nota = (prova + criativo) / 2`

Formatos que costumam vender por categoria (sugestão que aparece ao escolher a categoria no filtro):

| Categoria | Formatos sugeridos |
|---|---|
| Joias e acessórios | produto_destaque, provador, pessoa_falando |
| Roupas e calçados | provador, pessoa_falando, unboxing |
| Aparadores e barbeadores | demonstracao, antes_depois, pessoa_falando |
| Beleza e cosméticos | antes_depois, pessoa_falando, demonstracao |
| Suplementos e saúde | pessoa_falando, historia, demonstracao |
| Casa e cozinha | demonstracao, antes_depois, pessoa_falando |
| Eletrônicos | demonstracao, unboxing, pessoa_falando |
| Infantil e brinquedos | demonstracao, historia, unboxing |
| Esporte e fitness | demonstracao, pessoa_falando, antes_depois |
| Pet | demonstracao, historia, antes_depois |
| Carro e moto | demonstracao, antes_depois, pessoa_falando |
| Serviços e cursos | pessoa_falando, historia, arte_texto |
| Outros produtos | demonstracao, pessoa_falando, unboxing |

Ao lado de cada formato vai quanto ele dura de verdade no nicho: a média de dias no ar do formato ÷ a média da categoria, com 3 ou mais anúncios. Mostre só quando a diferença for clara ("dura 1,6x mais" ou "neste nicho, dura menos"). Se outro formato dura 1,3x ou mais, sugira também.

## 8. Telas e navegação

A moldura segue o painel da Shopify: barra escura no topo, lateral com cinco abas e a área de trabalho clara com o canto arredondado. Cada tela tem endereço próprio e termina numa ação.

### Moldura

- Barra do topo: a marca à esquerda; no centro, a busca "Buscar anúncio, nicho ou coleção" (atalho ⌘K), que procura na biblioteca e nos salvos; o sino de avisos; à direita, o perfil (iniciais e nome da loja) com o menu Minha loja, Plano e créditos, Conexões e Sair.
- Lateral: Início, Explorar, Garimpo, Salvos e Estúdio, com ícone e nome. Abaixo, "Garimpos recentes" (os 3 últimos, com o número de aprovados). No pé, Configurações e o cartão do plano ("Plano grátis · 1 de 3 garimpos no mês" e Assinar o Pro).
- Celular: a lateral vira uma linha de abas rolável no topo, e a ação principal da tela fica fixa embaixo.
- Rotas: /inicio, /explorar, /garimpo, /garimpo/:id, /salvos, /salvos/:colecao, /estudio, /video/:id (a ficha), /entrar, /boas-vindas, /config.
- Voltar: com a ficha aberta, fecha a ficha; com histórico, history.back(); sem histórico, vai à aba de cima.

### Entrada (/entrar e /boas-vindas)

1. Entrar com o Google ou com e-mail (link mágico). Sem cartão no plano grátis.
2. Três perguntas, uma por tela, com botões grandes: "O que você vende?" (as 13 categorias, ou colar o link do produto para o modelo de visão sugerir a categoria); "Onde você anuncia?" (Facebook e Instagram, TikTok Shop ou os dois, que define o modo padrão); "País e idioma" (Brasil e português já marcados).
3. Abre o Início com "Os 20 que mais vendem em <categoria>", vindos da biblioteca, sem esperar.

### Início

- No topo, uma pílula escura com a novidade do nicho: "37 anúncios novos em Casa e cozinha esta semana · Ver".
- Um leque de 3 capas e o título em duas linhas: "<Loja> está pronta para garimpar" / "O que você quer achar hoje?".
- A caixa grande: "Um produto ou nicho. Ex.: pote hermético, pet, garrafa térmica", com os chips Para vender e Para replicar no TikTok Shop e o botão de enviar, que abre um garimpo com essas palavras.
- Três cartões de próximo passo, escolhidos pelo estado da conta: os 20 melhores do nicho; continuar o último garimpo; transformar os salvos em roteiro; conectar o TikTok, quando a extensão não está instalada.

### Explorar

- Filtros numa linha, em chips com menu: Nicho, Plataforma, Para vender ou Para replicar, Prova, Formato e Idioma. Começa com o filtro do perfil.
- Prateleiras: "Em alta esta semana" (pela nota), "Ganchos que mais seguram" (hook_forte), "Fáceis de replicar" (modo replicar) e "Há mais tempo no ar" (dias).
- Cartões 9:16 ordenados pela nota: a capa com o gancho escrito em cima, a plataforma, a nota, o formato e a métrica ("74 dias no ar", "1,2 mi views", "18 mil curtidas"), e um círculo para salvar. Passar o mouse toca o vídeo sem som: o mp4 da fonte ou o embed do YouTube.
- Plano grátis: só os 20 melhores do nicho; o resto aparece desfocado com "Assinar o Pro".

### Garimpo

- Montar: a caixa de palavras (cada palavra vira etiqueta com ×; Enter ou vírgula adiciona; Backspace no vazio apaga a última); Ideias, 8 por vez, com "Escolher por mim"; Onde buscar, com o logo de cada fonte e cadeado com o motivo nas trancadas; Idioma; e o filtro numa linha ("Para vender · 60+ dias · gancho forte · produto físico · mudar").
- Garimpar (o destaque) cria o garimpo e mostra o ao vivo na mesma tela.
- Ao vivo:
  - Ponto pulsando e estado ("Garimpando", "Avaliando os últimos", "Concluído", "Parado"), o que está acontecendo agora, o tempo em mm:ss e o botão Parar.
  - Uma etiqueta por fonte, com quantos vídeos e o status: buscando "palavra", pronto, não deu (com o motivo), parado ou na fila.
  - Três números grandes ligados por setas: achados → avaliados → aprovados (este em destaque). Cada número dá um pulo quando muda.
  - Mosaico dos 48 mais novos: na fila (brilho cinza), avaliando (borda e varredura), aprovado (borda de destaque e selo do formato), reprovado (apagado). Até 6 tocam sem som.
  - Coluna "Aprovados agora" com os 7 últimos, cada um entrando no topo.
  - No fim: "Ver os N aprovados" (a grade do Explorar, só com este garimpo) e Nova busca.
- Antes de gastar o último garimpo do mês, avise. Sem garimpos, o botão vira Assinar o Pro.

### Ficha do vídeo (gaveta à direita, /video/:id)

- O vídeo grande com controles.
- O gancho como título, com a tradução embaixo; chips com formato, plataforma e métrica, idioma e anunciante.
- "Por que o [PREENCHER: Faro] aprovou" (ou "Por que não passou"): uma linha por critério com ✓, ✗ ou ⏱ e o valor ("Prova: 189 dias no ar", "Gancho: nota 77", "Trocar o produto: dá").
- Botões: Salvar em…, Abrir na plataforma, Copiar o gancho, Levar ao Estúdio e Baixar o vídeo (só onde a fonte permite, seção 14).
- O texto do anúncio fica recolhido. Esc fecha.

### Salvos

- Coleções à esquerda (por produto ou por cliente, com "+ Nova coleção") e a grade da coleção à direita. Referência que saiu do ar mostra "saiu do ar há 3 dias".
- Baixar vídeos: um zip com "01 - <gancho>.mp4" e a lista.csv, só das fontes que permitem.
- Copiar ganchos: lista numerada com o gancho, a tradução, formato · plataforma · prova e o link.
- Planilha: CSV com ";" e BOM UTF-8, para abrir no Excel. Colunas: Gancho, Tradução, Formato, Plataforma, Idioma, Prova, Duração, Tela, Dá para trocar, Nota, Anunciante, Link.
- Levar ao Estúdio (o destaque).

Estúdio (detalhe na seção 9): à esquerda, a referência e "Seu produto"; à direita, as abas Ganchos, Roteiro e Vídeo com IA; no pé, "Mesma estrutura da referência. Texto e cenas novos, com o seu produto." e o botão Gerar.

Configurações: Minha loja (as três respostas), Produtos, Conexões (a extensão, instalada ou não, com o link da Chrome Web Store; a Shopify), Plano e créditos (uso do mês) e Equipe (plano Agência).

Vazio e erro: tela sem dados diz o que fazer em uma frase, com o botão da ação. Erro diz o que houve e como resolver: "O Facebook não respondeu. Tente de novo em 1 minuto."

## 9. Estúdio

O Estúdio pega uma referência salva e o produto da pessoa e devolve três coisas: 5 ganchos, um roteiro cena por cena ou um vídeo novo com IA. A referência empresta a estrutura; texto, cenas, pessoa e marca são sempre novos.

### Entradas

- A referência: gancho, gancho_tipo, formato, descricao_visual, texto, duração e, quando houver, a estrutura lida do vídeo.
- Estrutura lida do vídeo: quando a fonte entrega o arquivo (Facebook, TikTok Ads), o trabalhador baixa o vídeo para uma pasta temporária, tira 6 quadros e a transcrição ([PREENCHER: modelo de fala para texto]) e apaga o arquivo. O modelo de visão resume em partes com início e fim em segundos. Sem arquivo (YouTube), vale a capa, o texto e a duração.
- O produto: nome, categoria, foto (da pessoa ou do fornecedor), preço opcional e o "entendimento" (o que é, para quem, palavras-chave), que o modelo de visão tira da foto. A foto manda: se o nome não bate com a foto, a tela mostra o conflito.

Geração de texto: modelo em MODELO_TEXTO, padrão claude-opus-5-5, output_config.effort em medium, saída estruturada por output_config.format. Instruções de sistema:

1. Ganchos. "Você escreve ganchos de anúncio em português do Brasil para vendedores de e-commerce. Recebe um anúncio de referência que está vendendo e o produto do usuário. Escreva 5 ganchos novos para o produto do usuário, com o mesmo tipo de gancho e o mesmo ritmo da referência. Não copie frases da referência, não cite a marca dela e não prometa resultado que o produto não pode provar. Cada gancho tem até 90 caracteres e funciona falado nos 3 primeiros segundos." Saída: `{"ganchos": [{"texto", "tipo", "porque"}]}` com exatamente 5 itens; tipo é uma chave de TIPOS_GANCHO.
2. Roteiro. "Você transforma um anúncio de referência num roteiro novo para o produto do usuário. Mantenha a estrutura (a ordem das partes e o tempo de cada uma) e troque tudo o que é da referência: texto, cenas, pessoa e marca. A fala é em português do Brasil, falada, com frases curtas. Cada cena diz o que se vê, o que se fala e o texto na tela. Total de até 30 s, ou até 60 s quando a referência for mais longa." Saída: `{"duracao_s", "cenas": [{"inicio_s", "fim_s", "parte", "fala", "tela", "texto_na_tela"}], "lista_de_cenas": [], "observacoes"}`; parte é gancho, problema, demonstracao, prova, chamada ou outro.
3. Tradução de gancho (gancho_pt, seção 6): "Traduza este gancho de anúncio para o português do Brasil falado, mantendo o tamanho e o efeito." Saída: `{"gancho_pt"}`.

### Vídeo com IA (fase 3)

- Gerador por API: [PREENCHER: gerador de vídeo]. Entrada: a foto do produto, o roteiro, 9:16, a duração e uma pessoa criada por IA.
- Antes de gerar, a tela mostra o custo em créditos e pede confirmação. O crédito sai só quando o vídeo fica pronto; falha devolve o crédito.
- O vídeo pronto é da pessoa: fica no nosso armazenamento, em estudio_saidas, e passa pelo avaliador. Nota 70 ou mais aparece como "pronto para rodar".

Nunca: editar o vídeo da referência; usar o rosto, a voz ou o nome da pessoa da referência ou de qualquer pessoa real; usar a marca da referência; usar foto de produto que não seja da pessoa ou do fornecedor dela.

## 10. Extensão do Chrome

A extensão faz duas coisas no navegador da própria pessoa: traz o TikTok Ads usando o login que ela já tem no TikTok for Business, e põe um botão "Salvar no [PREENCHER: Faro]" nas páginas de anúncio. Ela é opcional: sem ela, o TikTok Ads aparece com cadeado e o motivo.

### Montagem

- Manifest V3. host_permissions só para https://ads.tiktok.com/*, https://www.facebook.com/ads/library/*, https://www.tiktok.com/*, https://www.instagram.com/*, https://www.youtube.com/* e o domínio da nossa API.
- Pareamento: em Configurações › Conexões, o site mostra um código de 6 dígitos que vale 10 minutos. A extensão troca o código por um token que só pode enviar itens e ler a fila da extensão (/api/ext/*).
- O fundo da extensão fala direto com a nossa API. Não precisa do truque do receptor em 127.0.0.1 que o painel local usa hoje.

### Coleta do TikTok Ads (o mesmo método do coletor_tiktok.js, testado em 14/10 com 328 anúncios)

1. Um garimpo com TikTok Ads cria um pedido para a extensão daquela loja. A extensão consulta GET /api/ext/pedidos a cada 30 s enquanto o Chrome está aberto.
2. Com pedido na fila, ela abre em segundo plano a página "Principais anúncios" do Creative Center.
3. Um script no mundo da página instala um ouvido no XMLHttpRequest. Quando a página chama top_ads/v2/list com o cabeçalho user-sign, ele guarda os cabeçalhos assinados (timestamp, user-sign, web-id, lang). Eles não dependem da palavra e valem por alguns minutos.
4. Para a página assinar, o script faz uma busca na caixa "Pesquisar por palavras-chave".
5. Para cada palavra, até 2 páginas, com 600 ms de pausa: `fetch('/creative_radar_api/v1/top_ads/v2/list?period=180&keyword=<palavra>&page=<n>&limit=20&order_by=for_you&country_code=BR', {headers: <assinados>, credentials: 'include'})`.
6. Cada anúncio vira um item: id: tta:<id>, fonte: tiktok_ads, tipo_item: anuncio, anunciante = brand_name, texto = ad_title, hashtags, capa e vídeo (720p, senão 1080p ou 540p) de video_info, likes, ctr, orcamento (cost), objetivo (objective_key), setor (industry_key), duracao_s, largura, altura, vertical, termos e url_original. Título em escrita não latina fica de fora.
7. Os itens vão por POST /api/ext/itens em lotes; o status de cada palavra (buscando, fim, erro) vai por POST /api/ext/eventos.
8. Resposta 40101 "no permission" quer dizer sem login: o garimpo marca o TikTok Ads como erro com o motivo "entre no TikTok for Business neste navegador".

Botão Salvar: na Biblioteca de Anúncios, no Creative Center, no TikTok, no Instagram e no YouTube Shorts, um botão pequeno ao lado de cada anúncio ou vídeo. Um clique lê o id e os campos visíveis, manda por POST /api/ext/salvar e o item entra na biblioteca (na fila do avaliador) e nos Salvos da pessoa.

Limites: a extensão só age em páginas que a pessoa abriu ou no pedido que ela criou; no ritmo de uma pessoa; nunca digita senha; nunca lê as campanhas, os dados ou as mensagens da conta dela.

## 11. Planos, limites e cobrança

O garimpo é o que custa (cota das plataformas, provedor de dados e IA), então o limite fica nele; o Explorar só lê a biblioteca. Os preços são o ponto de partida para testar.

| Plano | Preço | Explorar | Garimpos por mês | Salvos | Baixar vídeos | Estúdio | Lojas |
|---|---|---|---|---|---|---|---|
| Grátis | R$ 0 | os 20 melhores do nicho | 3 | até 20 | não | 3 roteiros por mês | 1 |
| Pro | [PREENCHER: R$ 97]/mês | completo | 40 | sem limite | sim | ganchos e roteiros sem limite | 1 |
| Agência | [PREENCHER: R$ 297]/mês | completo | 150 | sem limite | sim | ganchos e roteiros sem limite, Radar | 5, com equipe |

Vídeo com IA: créditos à parte, vendidos em pacotes, com margem sobre o custo do gerador [PREENCHER: margem].

Onde o limite é aplicado (sempre no servidor, nunca só na tela):

- POST /api/garimpos confere uso.garimpos do mês contra o plano; acabou, responde 402 com o texto do botão "Assinar o Pro".
- GET /api/explorar no plano grátis devolve os 20 primeiros completos e o resto só com a capa desfocada (sem gancho, sem link).
- Downloads e Estúdio conferem o plano e contam em uso.
- Um garimpo que só usa o cache (seção 5) conta igual: a pessoa não precisa entender de cache.

Cobrança: Stripe Checkout para assinar, Stripe Customer Portal para trocar ou cancelar, em reais. O webhook do Stripe atualiza lojas.plano. Cartão recusado: 3 dias de tolerância, depois volta ao grátis sem apagar nada. uso zera no dia da renovação.

## 12. Design

Minimalista como o painel da Shopify, com o verde-limão do canal como única cor de destaque. A referência visual é o protótipo clicável do Plano do Faro (página privada: abra com a sua conta, tire prints das cinco abas e anexe ao prompt).

```css
:root {               /* claro */
  --bg: #f4f4f1; --surface: #ffffff; --sunk: #ebebe6;
  --ink: #151616; --ink-2: #46494a; --ink-3: #6f7274;
  --line: #deded8; --line-2: #cdcdc6;
  --bar: #121314; --bar-ink: #ededed; --bar-ink-2: #9a9c9d; --bar-field: #232527; --bar-line: #34373a;
  --marca: #d1fe17; --on-marca: #151616; --marca-texto: #4c6100; --marca-suave: #f0f9c8;
  --ok: #1e8048; --aviso: #93600a; --perigo: #b93838;
}
[data-theme="dark"] { /* escuro (e prefers-color-scheme: dark) */
  --bg: #0f1113; --surface: #17181b; --sunk: #121315;
  --ink: #f4f4f4; --ink-2: #bfc1c2; --ink-3: #8d8f91;
  --line: #ffffff1c; --line-2: #ffffff30;
  --bar: #0a0a0b; --bar-field: #1d1f21; --bar-line: #2c2f32;
  --marca-texto: #d1fe17; --marca-suave: #d1fe1712;
  --ok: #4ee466; --aviso: #dfab01; --perigo: #ff6b77;
}
--f-titulo: "Space Grotesk", "Arial Narrow", sans-serif;   /* títulos e ganchos */
--f-ui: Inter, system-ui, sans-serif;                        /* interface */
--f-mono: "IBM Plex Mono", ui-monospace, monospace;          /* rótulos, números, tempos */
```

Componentes:

- Botão principal (bt1): fundo limão e texto escuro. Um só por tela. Secundário (bt2): fundo da superfície, borda fina.
- Item da lateral: ícone de 17 px e nome; o ativo ganha o fundo da superfície e uma sombra leve.
- Chip: pílula de 12 px; ligado = fundo de tinta e texto claro.
- Cartão de anúncio: capa 9:16 com o gancho em Space Grotesk branco sobre degradê, a plataforma num selo mono no canto, a nota num selo limão, e embaixo o formato e a métrica.
- Ficha: gaveta à direita, 480 px no computador, tela cheia no celular.
- Ícones: Lucide desenhado inline em SVG, traço 1,8.

Movimento: números que sobem e dão um pulo quando mudam; cartão aprovado com um estalo; ponto pulsando no ao vivo. Tudo some com prefers-reduced-motion.

Acessibilidade e celular: foco visível em tudo que se clica; contraste AA nos dois temas; a partir de 820 px de largura para baixo, a lateral vira linha de abas no topo e as grades viram uma coluna, sem rolagem lateral da página.

## 13. API

JSON sobre HTTPS. O site autentica por cookie de sessão; a extensão, pelo token do pareamento, só nas rotas /api/ext/*. Toda rota confere se o recurso é da loja de quem pede.

| Grupo | Rota | O que faz |
|---|---|---|
| Conta | GET /api/eu | Conta, loja, plano e uso do mês |
| Conta | PATCH /api/loja | As três respostas do perfil |
| Biblioteca | GET /api/explorar?nicho=&plataforma=&modo=&prova=&formato=&idioma=&prateleira=&cursor= | Vídeos avaliados com o veredito por critério para aquele filtro |
| Biblioteca | GET /api/videos/:id | A ficha: vídeo, avaliação e avalia() |
| Garimpo | GET /api/ideias?modo=&idioma=&pagina= | 8 ideias de palavras |
| Garimpo | POST /api/garimpos | {termos, termos_idioma, fontes, idiomas, criterios} → {id}; confere o limite do plano |
| Garimpo | GET /api/garimpos/:id | Estado, fontes e contagens |
| Garimpo | POST /api/garimpos/:id/parar | Marca parado e as fontes sem fim como paradas |
| Garimpo | GET /api/garimpos/:id/fluxo | O fluxo ao vivo (SSE, abaixo) |
| Garimpo | GET /api/garimpos/:id/videos?aprovados=1 | A grade do garimpo |
| Salvos | GET, POST /api/colecoes e PATCH, DELETE /api/colecoes/:id | Coleções |
| Salvos | POST /api/salvos e DELETE /api/salvos/:colecao/:video | Salvar e tirar |
| Salvos | POST /api/colecoes/:id/zip | Tarefa que monta o zip; o link vale 24 h |
| Salvos | GET /api/colecoes/:id/planilha.csv e /ganchos.txt | Planilha e ganchos |
| Produtos | POST /api/produtos e PATCH /api/produtos/:id | Foto, nome e preço; o entendimento chega depois |
| Estúdio | POST /api/estudio | {video_id, produto_id, tipo} → {id} |
| Estúdio | GET /api/estudio/:id e POST /api/estudio/:id/confirmar | Resultado; a confirmação do vídeo cobra os créditos |
| Cobrança | POST /api/assinar, POST /api/portal e POST /webhooks/stripe | Stripe Checkout, Customer Portal e webhook |
| Extensão | POST /api/ext/parear, GET /api/ext/pedidos, POST /api/ext/itens, POST /api/ext/eventos, POST /api/ext/salvar | Seção 10 |

O fluxo ao vivo (text/event-stream, um por garimpo aberto na tela):

- retrato: o estado inteiro ao conectar (garimpo, fontes, contagens e os 48 vídeos mais novos com avaliação).
- fonte: {fonte, status, termo, novos, detalhe}.
- chegou: {videos: [...]}. Vídeo que já estava na biblioteca chega com a avaliação pronta.
- avaliando: {ids}, o lote que o avaliador está olhando.
- avaliado: {id, avaliacao, veredito}.
- fim: {status, vistos, aprovados}.

Cada evento tem id, para retomar com Last-Event-ID depois de uma queda. Um comentário de batimento a cada 15 s mantém a conexão. Evento atrasado de um garimpo já parado é ignorado.

## 14. Regras e cuidados

Estas regras valem em todo o código e o servidor as aplica mesmo quando a tela não deixa chegar lá.

1. Vídeo de outra marca é referência, nunca matéria-prima. Nada da filmagem, das pessoas, da voz, da trilha, das legendas ou do roteiro dele vai para um criativo gerado aqui. Trocar o objeto ou a pessoa editando o vídeo original não é feito.
2. Fontes de dados: usar só o caminho de cada fonte da seção 5, no ritmo de uma pessoa, sem contornar login nem bloqueio. Os termos de uso de cada fonte e do provedor de dados passam por um advogado antes do lançamento [PREENCHER: data da revisão].
3. Baixar vídeo só onde a fonte entrega o arquivo (Facebook e TikTok Ads). No YouTube fica o player, porque os termos do YouTube não permitem baixar. O arquivo baixado vai direto para o zip da pessoa e não fica no nosso armazenamento.
4. Foto de produto só da pessoa ou do fornecedor dela. Pessoa em vídeo gerado é sempre criada por IA, descrita em palavras; nunca o rosto de alguém real.
5. Fatos do produto só os que a pessoa deu. Nada de preço, promessa de saúde ou de dinheiro, ou oferta inventada.
6. Nenhum crédito é gasto sem o custo mostrado antes e a confirmação da pessoa.
7. Chaves só no servidor, em variáveis de ambiente: TYPESAFE_API_KEY, YOUTUBE_API_KEY, a chave do provedor de dados, ANTHROPIC_API_KEY, a do gerador de vídeo e as do Stripe. Nunca no navegador, no código, no repositório ou em log. Nenhuma tela mostra o nome de um fornecedor de IA.
8. TypeSafe: confirmar o uso do Jev dentro de um produto pago e o preço por volume antes da primeira cobrança.
9. LGPD: termos de uso, política de privacidade e um botão "Apagar minha conta" que apaga a loja, os salvos, os produtos e as saídas do Estúdio (a biblioteca compartilhada não tem dado pessoal e fica).
10. Marca: o nome [PREENCHER: Faro] passa pela busca no INPI e pelo registro do domínio antes de qualquer anúncio.
11. Testes nunca tocam dados de verdade: banco e fila de teste à parte, com dados simulados marcados como simulados.

## 15. Ordem de construção

Construa na ordem e só passe de fase com todos os testes dela marcados. Os testes rodam em banco e fila de teste à parte (seção 14).

Fase 0 · Decidir e validar (sem código de produto)

- [ ] Nome escolhido, com INPI e domínio conferidos.
- [ ] Custo por vídeo avaliado (capa + Jev) medido num lote de 100.
- [ ] TypeSafe confirmou o uso comercial e o preço por volume; termos do provedor de dados revisados.
- [ ] 10 vendedores usaram o protótipo e 3 disseram que pagariam.

Fase 1 · Explorar e Garimpo

- [ ] Conta nova entra com o Google, responde as três perguntas e vê os 20 melhores do nicho em menos de 1 minuto.
- [ ] Um garimpo de 2 palavras no YouTube e no Facebook mostra o ao vivo do zero ao fim; Parar deixa tudo parado e o que chegou fica.
- [ ] Todo vídeo novo recebe avaliação em minutos; reiniciar os trabalhadores não perde nada.
- [ ] A ficha explica cada ✓ e ✗; a planilha abre no Excel com acentos.
- [ ] O plano grátis bloqueia o 4º garimpo no servidor (402), não só na tela.
- [ ] Celular de 375 px sem rolagem lateral; console sem erros.

Fase 2 · Extensão e Estúdio

- [ ] Extensão pareada pelo código; um garimpo com TikTok Ads traz anúncios com curtidas, vídeo e medidas; sem login, aparece o motivo.
- [ ] Salvar pela extensão na Biblioteca de Anúncios leva o anúncio aos Salvos e à avaliação.
- [ ] O Estúdio devolve 5 ganchos e um roteiro cena por cena para o produto da pessoa, sem frase copiada da referência.
- [ ] Assinar, trocar e cancelar pelo Stripe mudam o plano na hora.

Fase 3 · Vídeo e Radar

- [ ] Vídeo com IA mostra o custo, pede confirmação, cobra só quando fica pronto e devolve o crédito em falha.
- [ ] O Radar avisa quando surge um vencedor novo no nicho e quando uma referência salva sai do ar.
- [ ] Plano Agência com 5 lojas e equipe.

Depois da fase 3, os próximos passos do painel continuam valendo: ler o vídeo inteiro (quadros e fala), aprender com o que a pessoa aprova e descarta, juntar o mesmo vídeo de várias lojas e reconferir as métricas toda semana.

## 16. Dados iniciais

A biblioteca nasce com os 1.266 vídeos que o painel local já avaliou (565 do Facebook, 445 do TikTok Ads, 256 do YouTube), para o Explorar abrir cheio no primeiro dia.

1. Exportar no Mac (painel/exportar_biblioteca.py, a escrever): junta o catálogo de estado_painel.json e de cada painel/arquivo/estado_*.json (o mais novo vence), completa com memoria[id].campos e anexa classif[id]. Grava biblioteca_inicial.jsonl, uma linha por vídeo.
2. Ids: os 295 anúncios antigos do Facebook com id só numérico ganham o prefixo meta:. Os demais já vêm com meta:, yt: ou tta:.
3. Importar no servidor (importar_biblioteca.py): grava videos e avaliacoes com versao_perguntas = 'painel-2026-10' e calcula prova, criativo e nota (seção 7). Rodar de novo não duplica nada.
4. Capas: as do Facebook e do TikTok expiram em dias. A importação tenta copiar cada capa; a que já expirou fica com um espaço neutro e é trocada quando o vídeo aparecer de novo num garimpo. As do YouTube são estáveis.
5. Os marcados do painel (referencias) viram a coleção "Do painel" só na loja do dono, nunca na de outra pessoa.
6. Conferir: depois da importação, select fonte, count(*) from videos group by fonte bate com 565, 445 e 256, e todo vídeo tem uma linha em avaliacoes.
