import { Icone } from "@/components/Icone";
import { IconeSidebar } from "@/components/IconesSidebar";
import { Logo } from "@/components/Logo";
import { Pose } from "@/components/Pose";
import styles from "./previa.module.css";

/** Representação visual do Início atual; não abre uma sessão nem busca dados privados. */
export function PreviaInicio() {
  return (
    <div className={styles.previa} aria-hidden="true">
      <div className={styles.janela}>
        <div className={styles.barra}><span><i /><i /><i /></span><small>Seu espaço na Cleo</small><Icone nome="cadeado" tamanho={10} /></div>
        <div className={styles.app}>
          <div className={styles.sidebar}>
            <div className={styles.marca}><Logo tamanho={19} /></div>
            <div className={styles.grupo}>
              <p>Menu principal</p>
              <div className={styles.ativo}><IconeSidebar nome="inicio" /><span>Início</span><kbd>⌘ M</kbd></div>
              <div><IconeSidebar nome="pesquisa" /><span>Pesquisa</span></div>
            </div>
            <div className={styles.grupo}>
              <p>Atividade</p>
              {[['ideias', 'Ideias'], ['garimpo', 'Garimpo'], ['salvos', 'Salvos']].map(([icone, nome]) => <div key={icone}><IconeSidebar nome={icone} /><span>{nome}</span></div>)}
            </div>
            <div className={styles.grupo}><p>Criação</p><div><IconeSidebar nome="estudio" /><span>Estúdio</span></div></div>
            <div className={styles.rodapeSidebar}>
              <div><IconeSidebar nome="busca" /><span>Buscar</span><kbd>⌘ K</kbd></div>
              <div><IconeSidebar nome="avisos" /><span>Avisos</span></div>
              <div className={styles.perfil}><b>B</b><span>Seu espaço</span><Icone nome="baixo" tamanho={11} /></div>
            </div>
          </div>
          <div className={styles.conteudo}>
            <div className={styles.mascote}><Pose nome="boas-vindas" largura={68} /></div>
            <h2>Boas-vindas à Cleo!</h2>
            <p className={styles.descricao}>Vamos deixar tudo pronto para você achar sua próxima ideia em poucos passos.</p>
            <div className={styles.tarefas}>
              <div className={styles.topoTarefas}><b>Seus primeiros passos</b><span>0 de 8</span><i /></div>
              <p>COMEÇAR <span>0/3</span></p>
              {[
                ["usuario", "Criar sua conta", "Para guardar suas buscas e ideias"],
                ["alvo", "Contar o que você procura", "A Cleo acerta mais quando conhece seus nichos"],
                ["maleta", "Contar qual é o seu SaaS", "Nome e o que ele faz, para ideias perto do seu negócio"],
              ].map(([icone, titulo, texto], i) => <div className={styles.tarefa} key={icone}><span><Icone nome={icone} tamanho={13} /></span><div><b>{titulo}</b><small>{texto}</small></div><em className={i === 0 ? styles.comecar : ""}>{i === 0 ? "Começar" : "Fazer"}</em></div>)}
              <div className={styles.paginas}><span>‹ &nbsp; Anterior</span><span><b>1</b>2 &nbsp; 3</span><span>Próxima &nbsp; ›</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
