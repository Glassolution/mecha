import styles from "./CardPremium.module.css";

export function CardPremium({ assinante, aoAbrir }: { assinante: boolean; aoAbrir: () => void }) {
  return <section className={styles.cartao} aria-labelledby="sidebar-premium-titulo">
    <div className={styles.conteudo}>
      <h2 id="sidebar-premium-titulo">{assinante ? "Seu espaço Premium" : "Upgrade para o Pro"}</h2>
      <p><span>{assinante ? "Mais espaço para suas ideias." : "Explore mais possibilidades"}</span><span>{assinante ? "Seu próximo grande começo." : "com a Cleo."}</span></p>
      <button type="button" className={styles.acao} onClick={aoAbrir} aria-haspopup="dialog">{assinante ? "Ver meu plano" : "Upgrade"}</button>
    </div>
  </section>;
}
