"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useApi } from "@/lib/api";
import type { Ideia } from "@/lib/tipos";
import { AvisoExemplo, CartaoIdeia, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { AbasPilula, Revela, Suspenso, TituloAnimado } from "@/components/Movimento";

type Nicho = { id: string; rotulo: string };
type Prateleira = "todas" | "explodindo" | "fora" | "criadores" | "vistas";
type Atencao = "leve" | "media" | "forte";

const GRUPOS: [string, string[]][] = [
  ["Negócios", ["vendas_marketing", "financas", "juridico", "rh"]],
  ["Criação", ["conteudo", "produtividade", "dev"]],
  ["Setores", ["saude", "educacao", "imobiliario", "ecommerce"]],
  ["Dia a dia", ["servicos_locais", "vida_pessoal"]],
];

export default function PaginaIdeias() {
  return (
    <Suspense fallback={<div className="esqueleto" style={{ height: 400 }} />}>
      <Ideias />
    </Suspense>
  );
}

function Ideias() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { eu } = useApp();
  const nicho = sp.get("nicho") ?? "";
  const prateleira = (sp.get("prateleira") as Prateleira) || "todas";
  const atencao = (sp.get("atencao") as Atencao) || "leve";
  const semBr = sp.get("sem_br") === "1";
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");

  useEffect(() => {
    if (sp.get("modo") === "criativo") router.replace("/ideias");
  }, [sp, router]);

  function mudar(params: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (!v || v === "todas") p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const q = new URLSearchParams({ atencao, prateleira, ...(nicho ? { nicho } : {}), ...(semBr ? { sem_br: "true" } : {}) });
  const { dados, carregando } = useApi<{ itens: Ideia[] }>(`/api/ideias?${q}`);
  const rotulo = (id: string) => nichos?.find((n) => n.id === id)?.rotulo ?? id;

  return (
    <>
      <section className="hero-x">
        <TituloAnimado className="titulo-x" texto="Ideias de SaaS em alta" />
        <Revela as="p" className="sub-x" i={4}>
          Vários vídeos falando do mesmo problema viram uma ideia. Veja quais estão ganhando atenção e quais ainda não têm versão no Brasil.
        </Revela>
      </section>

      <Revela as="nav" className="catalogo-x" aria-label="Filtrar por assunto">
        {GRUPOS.map(([titulo, ids]) => (
          <div key={titulo}>
            <h3>{titulo}</h3>
            <ul>
              {ids.map((id) => (
                <li key={id}>
                  <button aria-pressed={nicho === id} onClick={() => mudar({ nicho: nicho === id ? null : id })}>{rotulo(id)}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3>Sinal</h3>
          <ul>
            <li><button aria-pressed={semBr} onClick={() => mudar({ sem_br: semBr ? null : "1" })}>Sem versão no Brasil</button></li>
          </ul>
        </div>
      </Revela>

      <div className="barra-x">
        <AbasPilula<Prateleira>
          rotulo="Prateleira"
          valor={prateleira}
          mudar={(v) => mudar({ prateleira: v })}
          opcoes={[["todas", "Em alta"], ["explodindo", "Explodindo"], ["fora", "Bombando lá fora"], ["criadores", "Muitos criadores"], ["vistas", "Mais vistas"]]}
        />
        <div className="direita">
          <Suspenso<Atencao>
            rotulo="Atenção mínima"
            valor={atencao}
            mudar={(v) => mudar({ atencao: v === "leve" ? null : v })}
            opcoes={[["leve", "200 mil+ views"], ["media", "1 mi+ views"], ["forte", "5 mi+ views"]]}
          />
        </div>
      </div>

      <AvisoExemplo />
      {eu?.plano.id === "gratis" && (
        <div className="faixa">
          <span className="selo selo-novo">PRO</span>
          <span>O plano grátis mostra as 20 primeiras — <Link href="/config#plano">Assinar o Pro</Link></span>
        </div>
      )}
      {carregando && !dados ? (
        <div className="grade-ideias">{[0, 1, 2].map((i) => <div key={i} className="esqueleto" style={{ height: 420 }} />)}</div>
      ) : dados?.itens.length ? (
        <div className="grade-ideias">
          {dados.itens.map((i, n) => (
            <Revela key={i.id} i={n}>
              <CartaoIdeia i={i} />
            </Revela>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhuma ideia com esse filtro." texto="Tire um filtro ou garimpe palavras deste assunto." acao={<Link href="/garimpo" className="bt1">Garimpar</Link>} />
      )}
    </>
  );
}
