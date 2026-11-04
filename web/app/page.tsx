import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import { PreviaProduto } from "@/components/landing/PreviaProduto";
import s from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Cleo — descubra sua próxima ideia de SaaS",
  description: "Encontre ideias de SaaS e referências de anúncios nos vídeos do TikTok e Instagram. Pesquise um nicho, analise oportunidades e organize suas descobertas com a Cleo.",
};
const CRIAR = "/entrar?modo=criar";

function Marca({ clara = false }: { clara?: boolean }) {
  return <Link href="/" className={`${s.marca} ${clara ? s.marcaClara : ""}`} aria-label="Cleo, página inicial"><Image src="/marca/poses/logo.png" alt="" width={43} height={43} /><span>Cleo<span className={s.marcaPonto}>.</span></span></Link>;
}

export default function Landing() {
  return <div className={s.site}>
    <a href="#conteudo" className={s.pular}>Ir para o conteúdo</a>
    <header className={s.navbar}>
      <Marca />
      <nav aria-label="Navegação da página"><a href="#como-funciona">Como funciona</a><a href="#por-dentro">Por dentro da Cleo</a><a href="#duvidas">Dúvidas</a></nav>
      <div className={s.navAcoes}><Link href="/entrar" className={s.entrar}>Entrar</Link><Link href={CRIAR} className={s.botaoPequeno}>Começar grátis <Icone nome="diagonal" tamanho={14} /></Link></div>
    </header>

    <main id="conteudo">
      <section className={s.hero} aria-labelledby="hero-titulo">
        <div className={s.heroTexto}>
          <span className={s.eyebrow}><span /> SEU PRÓXIMO GRANDE COMEÇO</span>
          <h1 id="hero-titulo">O próximo SaaS<br />pode estar<br />no seu <em>feed.</em></h1>
          <p>A Cleo encontra vídeos no TikTok e Instagram para você descobrir ideias de SaaS e referências de anúncios. Da curiosidade à próxima oportunidade.</p>
          <div className={s.heroAcoes}><Link href={CRIAR} className={s.botao}>Encontre sua próxima ideia <Icone nome="direita" tamanho={17} /></Link><a href="#por-dentro" className={s.linkDiscreto}>Conheça a Cleo <Icone nome="baixo" tamanho={13} /></a></div>
          <span className={s.heroRodape}>Comece no plano gratuito. Explore no seu ritmo.</span>
        </div>
        <div className={s.heroArte} aria-label="A Cleo transforma pesquisas em referências e oportunidades">
          <div className={s.papelEscuro}><span className={s.papelLegenda}>TUDO COMEÇA COM UMA PERGUNTA</span><p>“E se existisse<br />um app para<br /><em>resolver isso?</em>”</p><div><Icone nome="tiktok" tamanho={17} /><Icone nome="instagram" tamanho={17} /><span>O mundo já está dando pistas.</span></div></div>
          <div className={s.papelClaro}>
            <span className={s.arteLabel}>CURIOSIDADE, ENCONTRE DIREÇÃO.</span>
            <div className={s.orbita} aria-hidden="true" />
            <Image className={s.mascoteHero} src="/marca/poses/bracos-abertos.png" alt="Cleo, uma mascote amarela de óculos, de braços abertos" width={340} height={281} priority />
            <span className={`${s.adesivo} ${s.adesivoIdeias}`}>Ideias de SaaS <Icone nome="estudio" tamanho={21} /></span>
            <span className={`${s.adesivo} ${s.adesivoCriativos}`}>Criativos que inspiram <Icone nome="diagonal" tamanho={18} /></span>
            <div className={s.arteBusca}><Icone nome="busca" tamanho={16} /><span>Qual nicho vamos explorar?</span><span><Icone nome="direita" tamanho={14} /></span></div>
          </div>
          <span className={s.seloArte}><Icone nome="bussola" tamanho={15} />Um olhar curioso.<br />Novas possibilidades.</span>
        </div>
      </section>

      <div className={s.fontes}><span>AS REFERÊNCIAS ESTÃO LÁ. A CLEO AJUDA A ENCONTRAR.</span><div><span><Icone nome="tiktok" tamanho={20} />TikTok</span><span><Icone nome="instagram" tamanho={21} />Instagram</span></div><p>Menos rolagem. Mais direção.</p></div>

      <section id="como-funciona" className={s.como} aria-labelledby="como-titulo">
        <div className={s.secaoCabecalho}><span className={s.eyebrow}>DA PRIMEIRA BUSCA AO PRÓXIMO PASSO</span><h2 id="como-titulo">O feed é infinito.<br />Seu tempo, <em>não.</em></h2><p>Encontre referências com um propósito.<br />A Cleo ajuda você a conectar os pontos.</p></div>
        <div className={s.passos}>
          <article><div className={s.passoArte}><span className={s.termoBusca}><Icone nome="busca" tamanho={18} />app para médicos<span className={s.cursor} /></span><div className={s.termosSoltos}><span>Um nicho</span><span>Uma dor</span><span>Uma curiosidade</span></div></div><span className={s.numeroPasso}>01 / EXPLORE</span><h3>Comece com uma palavra.</h3><p>Escolha um nicho ou problema. Pesquise no TikTok, no Instagram ou nos dois ao mesmo tempo.</p></article>
          <article><div className={`${s.passoArte} ${s.arteReferencias}`}><div><Icone nome="claquete" tamanho={24} /><span>Uma ferramenta</span></div><div><Icone nome="fala" tamanho={24} /><span>Uma necessidade</span></div><div><Icone nome="ideia" tamanho={24} /><span>Uma possibilidade</span></div></div><span className={s.numeroPasso}>02 / DESCUBRA</span><h3>Encontre os sinais.</h3><p>Veja vídeos, ferramentas e referências do seu mercado. Descubra o que merece um olhar mais atento.</p></article>
          <article><div className={`${s.passoArte} ${s.arteAnalise}`}><span><Icone nome="estudio" tamanho={16} />Um novo ponto de partida</span><p>Uma boa referência.<br /><em>Mil possibilidades.</em></p><Icone nome="diagonal" tamanho={28} /></div><span className={s.numeroPasso}>03 / APROFUNDE</span><h3>Dê forma à oportunidade.</h3><p>Peça uma análise, explore as dores do público e salve o que pode virar sua próxima ideia ou criativo.</p></article>
        </div>
      </section>

      <section id="por-dentro" className={s.produto} aria-labelledby="produto-titulo">
        <div className={s.produtoTexto}><span className={s.eyebrow}>UMA ASSISTENTE. DOIS CAMINHOS.</span><h2 id="produto-titulo">Para quem quer<br />criar <em>o próximo.</em></h2><p>Um novo software ou uma nova forma de divulgar o que você já construiu. A pesquisa começa no mesmo lugar.</p><div className={s.caminhos}><div><Icone nome="ideia" tamanho={20} /><span><h3>Encontre uma ideia de SaaS</h3><p>Explore problemas, ferramentas e oportunidades em um nicho que você quer conhecer.</p></span></div><div><Icone nome="claquete" tamanho={20} /><span><h3>Encontre seu próximo criativo</h3><p>Descubra referências de vídeos e ganchos para pensar nos anúncios do seu negócio.</p></span></div></div><Link href={CRIAR} className={s.linkEscuro}>Vamos explorar <Icone nome="direita" tamanho={16} /></Link></div>
        <PreviaProduto />
      </section>

      <section className={s.organizar} aria-labelledby="organizar-titulo">
        <div className={s.colecaoArte} aria-hidden="true"><div className={s.folhaFundo} /><div className={s.folhaFrente}><Icone nome="pacote" tamanho={30} /><span>Meu próximo SaaS</span><div><i /><i /><i /></div><small>Boas ideias merecem um lugar.</small></div><span className={s.seloSalvo}><Icone nome="check" tamanho={14} />Inspiração guardada</span></div>
        <div><span className={s.eyebrow}>DA DESCOBERTA À SUA BIBLIOTECA</span><h2 id="organizar-titulo">Sua inspiração.<br />No lugar <em>certo.</em></h2><p>Salve vídeos, organize coleções por nicho ou projeto e volte às referências quando for a hora de criar.</p><Link href={CRIAR} className={s.linkEscuro}>Monte sua coleção <Icone nome="direita" tamanho={16} /></Link></div>
      </section>

      <section id="duvidas" className={s.faq} aria-labelledby="faq-titulo"><div><span className={s.eyebrow}>ANTES DE COMEÇAR</span><h2 id="faq-titulo">Curiosidade<br />é <em>bem-vinda.</em></h2></div><div className={s.perguntas}>
        <details><summary>O que é a Cleo?<Icone nome="mais" tamanho={17} /></summary><p>A Cleo é uma ferramenta de pesquisa e análise para descobrir ideias de SaaS e referências de criativos a partir de vídeos do TikTok e Instagram. Você escolhe um nicho, explora os resultados e aprofunda as referências que chamarem sua atenção.</p></details>
        <details><summary>Preciso ter um negócio para usar?<Icone nome="mais" tamanho={17} /></summary><p>Não. Você pode explorar um mercado para encontrar uma ideia de software ou informar seu negócio para buscar referências de criativos mais próximas do que você faz.</p></details>
        <details><summary>Como funciona a análise?<Icone nome="mais" tamanho={17} /></summary><p>Você escolhe um vídeo e pede uma análise com IA. Também pode analisar oportunidades nos resultados de uma pesquisa para explorar dores do público e possíveis ideias de SaaS.</p></details>
        <details><summary>Posso começar gratuitamente?<Icone nome="mais" tamanho={17} /></summary><p>Sim. Crie sua conta para começar no plano gratuito. Os limites de pesquisa e o seu consumo aparecem dentro da plataforma, em Plano e uso.</p></details>
      </div></section>

      <section className={s.ctaFinal} aria-labelledby="cta-titulo"><div><span className={s.eyebrow}>A PRÓXIMA IDEIA NÃO VAI SE ENCONTRAR SOZINHA.</span><h2 id="cta-titulo">Sua curiosidade<br />merece <em>uma Cleo.</em></h2><Link href={CRIAR} className={s.botaoClaro}>Começar a explorar <Icone nome="direita" tamanho={17} /></Link></div><Image src="/marca/poses/acenando.png" alt="Cleo acenando" width={300} height={300} /></section>
    </main>
    <footer className={s.rodape}><Marca /><span>Um olhar curioso para o que vem a seguir.</span><div><a href="#como-funciona">Como funciona</a><Link href="/entrar">Entrar na Cleo <Icone nome="diagonal" tamanho={13} /></Link></div></footer>
  </div>;
}
