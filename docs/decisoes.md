# Decisões do dono (valem sobre radar-saas.md)

## 19/10/2026

1. **Ordem de construção trocada.** Primeiro o projeto, o design e a coleta de vídeos funcionando. O extrator de SaaS (e o teste dos 100 vídeos da Fase 0) entra quando o site estiver pronto para publicar.
   - Até lá, as Ideias aparecem com dados de exemplo marcados "EXEMPLO"; os vídeos são reais.
2. **Sem transcrição própria (fala para texto).** Usamos só a legenda que o TikTok já gera, trazida pelo provedor. Vídeo sem legenda segue com legenda do post + capa.
3. **Provedor do TikTok:** Apify, actor `clockworks/tiktok-scraper`, plano grátis (US$ 5/mês). Reserva fica para depois; a interface `ColetorTikTok` já nasce pronta para dois provedores.
4. **Extrator, quando entrar:** começar pelo modelo mais barato (Claude Haiku 5.5) e só subir para o Opus se não acertar 85%.
5. **Design:** referência visual é o Mobbin (mobbin.com/discover/sites), em **preto e branco**. Sem cor de destaque colorida: o destaque é o branco no tema escuro e o preto no tema claro. Substitui o limão do Faro e o violeta sugerido no Radar.
   - Fundo escuro, títulos grandes, cartões cinza-escuro com cantos bem arredondados, busca em pílula no centro do topo, botão principal em pílula branca, abas com sublinhado.
6. **Logo provisória:** nuvem com dois olhos e um brilho, nome em letra arredondada minúscula, no estilo da imagem enviada (logo "attie"). Desenho próprio, não cópia da marca de terceiros. Preto e branco.
7. **Nome provisório:** "radar".
8. **Segurança das chaves:** só em `.env` na raiz (permissão 600, fora do git). Só a API lê. O site nunca recebe chave.

9. **Navegação no topo, sem lateral.** No estilo Mobbin, as 5 abas (Início, Ideias, Garimpo, Salvos, Estúdio) ficam na barra do topo; no celular viram uma linha rolável. Substitui a lateral do Faro.
10. **Entrada provisória:** "Entrar neste computador" (só com `AMBIENTE=dev`), conta local com plano Pro para testar sem esbarrar no limite. O limite do grátis (402 no 4º garimpo) já está no servidor e tem teste.
11. **Transcrição fora da tela** (regra 2 da seção 14): a API não devolve a transcrição; a ficha só diz se há fala captada.

## Primeiro garimpo real (19/10/2026)

- Palavras: "ai for doctors" (en/US) e "app para médicos" (pt/BR), 12 por busca + 12 pela hashtag.
- Resultado: 47 vídeos em 1 min 01 s; **37 com legenda do TikTok (79%)**, acima dos 70% da Fase 0.
- Custo medido: US$ 0,24 (cerca de US$ 0,005 por vídeo), do crédito grátis da Apify (US$ 5/mês). Uso do mês após o teste: US$ 0,26.
- Conta: com o crédito grátis cabem cerca de 40 palavras por mês. O garimpo inicial de 60 palavras da Fase 1 vai precisar do plano pago da Apify ou de menos vídeos por palavra.

## Como rodar no Mac

`./rodar.sh` na pasta do projeto liga banco, fila, servidor, trabalhador e site. Abra http://localhost:3000. Ctrl+C desliga.

## Antes de publicar (pendências)

- [ ] Extrator de SaaS + teste dos 100 vídeos (≥ 85% de acerto, nenhum domínio inventado) e custo por vídeo.
- [ ] Jev/TypeSafe (ou perguntas pela Claude) e agrupamento em ideias.
- [ ] YouTube Shorts (chave do Google).
- [ ] Login de verdade: Google OAuth + link mágico (Resend).
- [ ] Hospedagem: Vercel (site), Railway ou Fly (API e fila), Neon ou Supabase (banco), Cloudflare R2 (capas).
- [ ] Stripe.
- [ ] Gerar um token novo da Apify (o atual passou pelo chat).
- [ ] Nome definitivo, INPI e domínio; trocar a logo provisória.
- [ ] Revisão jurídica dos termos do provedor de dados.
