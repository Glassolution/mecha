import Link from "next/link";
import { Icone } from "@/components/Icone";

export default function Estudio() {
  return (
    <>
      <h1 className="titulo-pagina">Estúdio</h1>
      <p className="sub-pagina">Transforma uma ideia salva num plano, ou um vídeo de referência em ganchos e roteiro para o seu SaaS.</p>
      <div className="proximos" style={{ marginTop: 32 }}>
        {[
          { icone: "ideia", t: "Plano da ideia", d: "O problema, quem já faz, a brecha no Brasil e a versão mínima." },
          { icone: "fala", t: "5 ganchos", d: "Mesmo tipo de gancho da referência, com texto novo para o seu SaaS." },
          { icone: "play", t: "Roteiro cena por cena", d: "A estrutura da referência, com fala, tela e o que gravar no software." },
        ].map((c) => (
          <div key={c.t} className="proximo" style={{ opacity: 0.75 }}>
            <Icone nome={c.icone} tamanho={22} />
            <h3>{c.t}</h3>
            <p className="suave">{c.d}</p>
            <span className="ir fraco"><Icone nome="cadeado" tamanho={14} /> Chega na próxima fase</span>
          </div>
        ))}
      </div>
      <div className="vazio" style={{ marginTop: 24 }}>
        <p>Enquanto isso, junte referências nos Salvos. Elas vão direto para o Estúdio quando ele abrir.</p>
        <Link className="bt1" href="/salvos">Ver meus salvos</Link>
      </div>
    </>
  );
}
