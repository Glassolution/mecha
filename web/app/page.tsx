import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import { PreviaProduto } from "@/components/landing/PreviaProduto";
import { Entrada, MenuMobile, RecursosCleo } from "@/components/landing/LandingInteracoes";
import s from "@/components/landing/landing.module.css";
import { MascoteLanding } from "@/components/landing/MascoteLanding";

export const metadata: Metadata = {
  title:"Cleo — transforme referências em novas oportunidades",
  description:"Encontre ideias de SaaS e referências de criativos no TikTok e Instagram. Pesquise um nicho, analise oportunidades com IA e organize suas descobertas com a Cleo.",
};
const CRIAR = "/entrar?modo=criar";
function Marca() {
  return <Link href="/" className={s.marca} aria-label="Cleo, página inicial"><Image src="/marca/cleo-icone.png" width={38} height={38} alt="" /><span>Cleo</span></Link>;
}
export default function Landing() {
  return <div className={s.site}>
    <a className={s.pular} href="#conteudo">Ir para o conteúdo</a>
    <header className={s.header}><div className={s.navbar}><Marca /><nav className={s.navDesktop} aria-label="Navegação principal"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#para-voce">Para quem é</a><a href="#duvidas">Dúvidas</a></nav><div className={s.navAcoes}><Link className={s.entrar} href="/entrar">Entrar</Link><Link className={s.botaoNav} href={CRIAR}>Começar grátis <Icone nome="direita" tamanho={14} /></Link><MenuMobile /></div></div></header>
    <main id="conteudo">
      <section className={`${s.hero} ${s.container}`} aria-labelledby="hero-titulo">
        <div className={s.heroTexto}><span className={s.eyebrow}>Cleo para suas próximas ideias</span><h1 id="hero-titulo">Transforme referências em novas oportunidades.</h1><p>Descubra ideias de SaaS e criativos nos vídeos do TikTok e Instagram. Pesquise um nicho, entenda os sinais e encontre seu próximo caminho com a Cleo.</p><div className={s.heroAcoes}><Link className={s.botao} href={CRIAR}>Experimente a Cleo <Icone nome="direita" tamanho={16} /></Link><a className={s.link} href="#como-funciona">Veja como funciona <Icone nome="direita" tamanho={15} /></a></div></div>
        <PreviaProduto />
      </section>

      <Entrada className={`${s.fontes} ${s.container}`}><p>Um novo olhar para as referências do seu mercado.</p><div><span><Icone nome="tiktok" tamanho={23} />TikTok</span><span><Icone nome="instagram" tamanho={23} />Instagram</span><span className={s.fontesDivisor} /><span className={s.fontesLegenda}>Sua curiosidade.<br />A pesquisa da Cleo.</span></div></Entrada>

      <section id="como-funciona" className={`${s.secao} ${s.container}`} aria-labelledby="como-titulo"><Entrada className={s.tituloCentral}><MascoteLanding pose="acenando" /><h2 id="como-titulo">Menos tempo procurando.<br />Mais espaço para criar.</h2><p>Do primeiro interesse à referência que vale guardar.<br />A Cleo conecta as etapas da sua pesquisa.</p><Link className={s.botao} href={CRIAR}>Começar uma pesquisa <Icone nome="direita" tamanho={16} /></Link></Entrada><Entrada><RecursosCleo /></Entrada></section>

      <section id="para-voce" className={`${s.secao} ${s.container}`} aria-labelledby="para-titulo"><Entrada className={s.tituloCentral}><h2 id="para-titulo">Uma ferramenta.<br />Novas formas de começar.</h2><p>Para encontrar o que construir ou uma nova maneira<br />de apresentar o que você já criou.</p></Entrada><div className={s.casos}>
        <Entrada className={s.caso}><div className={s.casoArte}><div className={s.cartaoIdeia}><span><Icone nome="ideia" tamanho={20} />A próxima ideia</span><h3>Todo bom produto<br />começa com<br />um problema.</h3><div><span>Um nicho</span><Icone nome="direita" tamanho={13} /><span>Uma possibilidade</span></div></div><div className={s.cartaoTras} /></div><div className={s.casoTexto}><h3>Encontre uma ideia de SaaS</h3><p>Explore ferramentas, necessidades e oportunidades em um mercado que desperta a sua curiosidade. Aprofunde os resultados com análises de IA.</p><Link className={s.link} href={CRIAR}>Explorar oportunidades <Icone nome="direita" tamanho={15} /></Link></div></Entrada>
        <Entrada className={s.caso}><div className={`${s.casoArte} ${s.criativoArte}`}><div className={s.videoMock}><span><Icone nome="play" tamanho={21} /></span><p>Uma boa referência.<br />Uma nova forma<br />de contar sua história.</p><div><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div></div><div className={s.casoTexto}><h3>Descubra seu próximo criativo</h3><p>Encontre vídeos e ganchos para se inspirar nos anúncios do seu negócio. Organize referências e explore novas abordagens para comunicar sua solução.</p><Link className={s.link} href={CRIAR}>Encontrar referências <Icone nome="direita" tamanho={15} /></Link></div></Entrada>
      </div></section>

      <section id="recursos" className={s.faixaRecursos}><div className={`${s.container} ${s.recursosInterno}`}><Entrada><span className={s.eyebrow}>Do interesse ao próximo passo</span><h2>Seu processo de descoberta.<br />Em um só lugar.</h2></Entrada><div className={s.beneficios}>{[{icone:'busca',titulo:'Pesquise com contexto',texto:'Comece por um nicho, um problema ou uma ferramenta que você quer conhecer.'},{icone:'analise',titulo:'Aprofunde com IA',texto:'Converse sobre um vídeo e explore oportunidades a partir dos resultados.'},{icone:'salvo',titulo:'Organize o que importa',texto:'Reúna suas referências em coleções por nicho, cliente ou próximo projeto.'}].map(b => <Entrada key={b.titulo}><Icone nome={b.icone} tamanho={24} /><h3>{b.titulo}</h3><p>{b.texto}</p></Entrada>)}</div></div></section>

      <section id="duvidas" className={`${s.secao} ${s.container} ${s.faq}`} aria-labelledby="faq-titulo"><Entrada><h2 id="faq-titulo">Perguntas frequentes</h2></Entrada><div className={s.perguntas}>
        <details><summary>O que é a Cleo?<Icone nome="mais" tamanho={19} /></summary><p>A Cleo é uma ferramenta de pesquisa e análise para descobrir ideias de SaaS e referências de criativos a partir de vídeos do TikTok e Instagram. Você escolhe um nicho, explora os resultados e aprofunda as referências que chamarem sua atenção.</p></details>
        <details><summary>Preciso ter um negócio para usar?<Icone nome="mais" tamanho={19} /></summary><p>Não. Você pode explorar um mercado para encontrar uma ideia de software ou informar seu negócio para buscar referências de criativos mais próximas do que você faz.</p></details>
        <details><summary>Como funciona a análise com IA?<Icone nome="mais" tamanho={19} /></summary><p>Escolha um vídeo para pedir uma análise e conversar sobre a referência. Você também pode analisar os resultados de uma pesquisa para explorar dores do público e possíveis oportunidades de SaaS.</p></details>
        <details><summary>Onde ficam minhas referências?<Icone nome="mais" tamanho={19} /></summary><p>Você pode salvar os vídeos em coleções dentro da Cleo e organizar tudo por tema ou projeto. Suas referências ficam disponíveis na seção Salvos.</p></details>
        <details><summary>Posso começar gratuitamente?<Icone nome="mais" tamanho={19} /></summary><p>Sim. Crie sua conta para começar no plano gratuito. Você acompanha os limites e o consumo de pesquisas e análises dentro da plataforma, em Plano e uso.</p></details>
      </div></section>

      <section className={s.ctaFinal} aria-labelledby="cta-titulo"><Entrada><MascoteLanding pose="pulando" /><h2 id="cta-titulo">Sua próxima ideia<br />começa com uma busca.</h2><p>Encontre novas possibilidades com a Cleo.</p><Link className={s.botao} href={CRIAR}>Começar grátis <Icone nome="direita" tamanho={16} /></Link></Entrada></section>
    </main>
    <footer className={`${s.rodape} ${s.container}`}><div><Marca /><p>Um novo olhar para o que vem a seguir.</p></div><nav aria-label="Links do rodapé"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#duvidas">Dúvidas</a><Link href="/entrar">Entrar na Cleo <Icone nome="diagonal" tamanho={13} /></Link></nav><span>Cleo © 2026</span></footer>
  </div>;
}
