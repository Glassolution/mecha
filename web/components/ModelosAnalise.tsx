/** Enviada sozinha quando a conversa de um vídeo abre pela primeira vez. */
export const PERGUNTA_INICIAL = "Analise este vídeo: qual é o problema, qual a solução e que SaaS eu posso criar.";
/** Enviada pelo botão que aparece quando a Cleo oferece o prompt. */
/** Para quem quer replicar ou mandar refazer o vídeo (investidor, marketing, quem já tem um SaaS). */
export const PERGUNTA_CRIATIVO = "Analise o criativo deste vídeo: o que deu certo, se está funcionando de verdade, como recriar para divulgar um SaaS e quem pode fazer.";
export const PEDIR_ROTEIRO = "Sim, escreva o roteiro completo do criativo.";
export const PEDIR_PROMPT = "Sim, crie o prompt para eu colar no Claude Code.";
export const PEDIR_DIVULGACAO = "Como eu divulgo esse produto? É B2B, B2C ou B2G, quais canais usar e se vale anúncio pago.";

export const MODELOS_ANALISE = [
  { id: "completa", nome: "Análise completa", curto: "Completa", icone: "analise", descricao: "O problema, a solução e a ideia de SaaS.", pergunta: PERGUNTA_INICIAL },
  { id: "criativo", nome: "Análise do criativo", curto: "Criativo", icone: "claquete", descricao: "O que deu certo, como recriar e quem grava.", pergunta: PERGUNTA_CRIATIVO },
  { id: "ideias", nome: "Ideias de SaaS", curto: "Ideias", icone: "ideia", descricao: "Uma ideia original, para quem e o diferencial.", pergunta: "Que ideia original de SaaS eu poderia explorar a partir deste vídeo? Explique o problema, o público, o diferencial e como ela se encaixa no meu negócio. Aponte o que ainda é hipótese." },
  { id: "prompt", nome: "Prompt para o Claude Code", curto: "Prompt", icone: "foguete", descricao: "Um prompt pronto para começar a construir.", pergunta: PEDIR_PROMPT },
  { id: "divulgacao", nome: "Como divulgar", curto: "Divulgar", icone: "anuncio", descricao: "Para quem vender, os canais e se vale anúncio.", pergunta: PEDIR_DIVULGACAO },
  { id: "validacao", nome: "Plano de validação", curto: "Validação", icone: "alvo", descricao: "Um teste de uma semana antes de construir.", pergunta: "Monte um plano de uma semana para validar uma oportunidade relacionada a este vídeo. Quais hipóteses testar, com quem conversar e que evidência buscar antes de construir?" },
] as const;

/** Ilustração editorial da referência: três prompts e uma seta desenhada à mão. */
export function EsbocoModelos() {
  return <div className="ac-esboco" aria-hidden="true">
    <svg className="ac-seta-manual" viewBox="0 0 220 108" fill="none">
      <path d="M28 99C45 66 73 47 92 59C118 76 104 111 84 95C59 73 107 55 135 49C161 43 180 24 184 8"/>
      <path d="m175 15 10-9 7 12"/>
    </svg>
    {[68, 45, 59].map((largura, i) => <div className="ac-esboco-linha" key={i}>
      <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h10"/></svg>
      <svg className="ac-esboco-chevron" viewBox="0 0 12 12" fill="none"><path d="m4 3 3 3-3 3"/></svg>
      <span style={{ width: `${largura}%` }}/><i/>
    </div>)}
  </div>;
}
