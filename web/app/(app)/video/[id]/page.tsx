"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { ICONE_FONTE, IDIOMA, num, PLATAFORMA, quando } from "@/lib/fmt";
import type { FichaVideo } from "@/lib/tipos";
import { ListaVeredito, primeiraLinha, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { rotaAnalisar } from "@/components/EscolhaVideo";
import { retornoDosVideos } from "@/lib/navegacaoVideo";
import { Icone } from "@/components/Icone";
import { AbasPilula } from "@/components/Movimento";
import { NumerosVideo } from "@/components/NumerosVideo";
import { PlayerVideo } from "@/components/PlayerVideo";
import { SalvarEm } from "@/components/SalvarEm";

function pct(x: number) {
  const casas = x < 0.01 ? 2 : x < 0.1 ? 1 : 0;
  return `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
}

/** Até três frases que traduzem os números para quem decide. Só contas com os dados reais. */
function leitura(v: FichaVideo): { icone: string; texto: React.ReactNode }[] {
  const frases: { icone: string; texto: React.ReactNode }[] = [];
  const dias = v.publicado ? Math.max(1, Math.floor((Date.now() - new Date(v.publicado).getTime()) / 86_400_000)) : null;
  if (v.views_dia && dias) {
    frases.push({ icone: "sobe", texto: <>Ganhou em média <b>{num(v.views_dia)} views por dia</b> desde que foi postado, há {dias} {dias === 1 ? "dia" : "dias"}.</> });
  }
  if (v.views && v.autor_seguidores) {
    const r = v.views / v.autor_seguidores;
    frases.push(
      r >= 1
        ? { icone: "raio", texto: <>Passou da base do criador: <b>{r.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x o número de seguidores</b>. Foi o conteúdo que puxou o alcance, não o perfil.</> }
        : { icone: "pessoas", texto: <>Alcançou <b>{pct(r)} dos seguidores</b> do criador. O tamanho do perfil ajudou a espalhar.</> },
    );
  }
  if (v.views && v.salvamentos) {
    const s = v.salvamentos / v.views;
    frases.push({
      icone: "salvo",
      texto: s >= 0.01
        ? <><b>{num(v.salvamentos)} pessoas salvaram</b> ({pct(s)} de quem viu). Quem salva vídeo de ferramenta pretende usar ou voltar depois.</>
        : <><b>{num(v.salvamentos)} pessoas salvaram</b> ({pct(s)} de quem viu). Acima de 1% costuma indicar que o público quer usar a ferramenta.</>,
    });
  }
  return frases.slice(0, 3);
}

type AbaEsq = "detalhes" | "legenda";
type AbaDir = "numeros" | "leitura";

/** Assistir: o vídeo no centro, os detalhes à esquerda e os números à direita, como um editor. */
export default function AssistirVideo() {
  const { id } = useParams<{ id: string }>();
  const videoId = decodeURIComponent(id);
  const router = useRouter();
  const parametros = useSearchParams();
  const { avisar } = useApp();
  const { dados: v, erro } = useApi<FichaVideo>(`/api/videos/${encodeURIComponent(videoId)}`);
  const voltarPara = retornoDosVideos(parametros.get("origem"), v?.garimpo_id);
  const [salvando, setSalvando] = useState(false);
  const [esq, setEsq] = useState<AbaEsq>("detalhes");
  const [dir, setDir] = useState<AbaDir>("numeros");

  function voltar() {
    router.push(voltarPara);
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.querySelector(".fundo-janela")) voltar();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (erro) return <Vazio titulo="Vídeo não encontrado." texto="Ele pode ter saído da biblioteca." acao={<Link className="bt1" href="/pesquisa">Voltar à pesquisa</Link>} />;
  if (!v) return <div className="esqueleto" style={{ height: 600, marginTop: 24, borderRadius: 24 }} />;

  const titulo = v.gancho ?? primeiraLinha(v.texto_completo);
  const conferidos = v.veredito.itens.filter((i) => i.ok !== null);
  const aprovados = conferidos.filter((i) => i.ok).length;
  const frases = leitura(v);
  const detalhes = [
    { icone: ICONE_FONTE[v.fonte] ?? "play", k: "Plataforma", val: PLATAFORMA[v.fonte] ?? v.fonte },
    { icone: "globo", k: "Idioma", val: v.idioma ? IDIOMA[v.idioma] ?? v.idioma : "—" },
    { icone: "relogio", k: "Duração", val: v.duracao_s ? `${v.duracao_s} s` : "—" },
    { icone: "sobe", k: "Postado", val: v.publicado ? quando(v.publicado) : "—" },
    { icone: "fala", k: "Fala captada", val: v.transcricao_chars > 0 ? "Sim" : "Não" },
    { icone: "busca", k: "Achado com", val: v.termos.join(", ") || "—" },
  ];

  async function copiarLink() {
    await navigator.clipboard.writeText(v!.url_original);
    avisar("Link copiado");
  }

  return (
    <div className="av">
      <aside className="av-painel av-esq" aria-label="Sobre o vídeo">
        <div className="av-autor">
          <span className="av-avatar" aria-hidden="true">{(v.autor_nome || v.autor || "?").replace("@", "").slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{v.autor_nome || v.autor}</b>
            <small>{v.autor}{v.autor_seguidores ? ` · ${num(v.autor_seguidores)} seguidores` : ""}</small>
          </span>
        </div>
        <h1 className="av-titulo">{titulo}</h1>
        <AbasPilula<AbaEsq> rotulo="Sobre o vídeo" valor={esq} mudar={setEsq} opcoes={[["detalhes", "Detalhes"], ["legenda", "Legenda"]]} />
        {esq === "detalhes" ? (
          <ul className="av-lista">
            {detalhes.map((d) => (
              <li key={d.k}>
                <span className="av-quadro"><Icone nome={d.icone} tamanho={15} /></span>
                <span className="av-lista-k">{d.k}</span>
                <span className="av-lista-v" title={d.val}>{d.val}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="av-legenda">
            <p>{v.texto_completo || "Sem legenda."}</p>
            {v.hashtags.length > 0 && <div className="av-tags">{v.hashtags.slice(0, 12).map((h) => <span key={h}>#{h}</span>)}</div>}
          </div>
        )}
        <a className="av-externo" href={v.url_original} target="_blank" rel="noopener noreferrer">
          <Icone nome="abrir" tamanho={15} /> Abrir no {PLATAFORMA[v.fonte] ?? "site"}
        </a>
      </aside>

      <section className="av-centro" aria-label="Vídeo">
        <div className="av-ferramentas" role="toolbar" aria-label="Ações do vídeo">
          <button className="av-ferr" onClick={voltar} aria-label="Voltar" data-dica="Voltar · Esc"><Icone nome="voltar" tamanho={17} /></button>
          <span className="av-sep" aria-hidden="true" />
          <button className="av-ferr" onClick={() => setSalvando(true)} aria-label="Salvar" data-dica="Salvar"><Icone nome="salvo" tamanho={17} /></button>
          <button className="av-ferr" onClick={copiarLink} aria-label="Copiar o link" data-dica="Copiar link"><Icone nome="link" tamanho={17} /></button>
          <a className="av-ferr" href={v.url_original} target="_blank" rel="noopener noreferrer" aria-label="Abrir no site" data-dica="Abrir no site"><Icone nome="abrir" tamanho={17} /></a>
          <span className="av-sep" aria-hidden="true" />
          <Link className="av-analisar" href={rotaAnalisar(v.id, voltarPara)}><Icone nome="analise" tamanho={16} /> Analisar</Link>
        </div>

        <div className="av-palco">
          <div className="av-moldura"><PlayerVideo v={v} /></div>
        </div>

        <Link className="av-pergunta" href={rotaAnalisar(v.id, voltarPara)}>
          <span className="av-pergunta-txt">Vale criar um SaaS em cima deste vídeo?</span>
          <span className="av-pergunta-pe">
            <span className="av-chip"><Icone nome="ideia" tamanho={14} /> Para o seu nicho</span>
            <span className="av-pergunta-ir" aria-hidden="true"><Icone nome="cima" tamanho={16} /></span>
          </span>
        </Link>
      </section>

      <aside className="av-painel av-dir" aria-label="Números">
        <AbasPilula<AbaDir> rotulo="Números" valor={dir} mudar={setDir} opcoes={[["numeros", "Números"], ["leitura", "Leitura"]]} />
        {dir === "numeros" ? (
          <div className="av-bloco"><NumerosVideo v={v} /></div>
        ) : (
          <div className="av-bloco">
            {frases.length ? (
              <ul className="fv-leitura">
                {frases.map((f, n) => (
                  <li key={n}><span className="fv-leitura-icone"><Icone nome={f.icone} tamanho={15} /></span><p>{f.texto}</p></li>
                ))}
              </ul>
            ) : <p className="suave">Ainda não há números suficientes para uma leitura.</p>}
          </div>
        )}

        <div className="av-secao">
          <h2>Dá para refazer?</h2>
          <span className="av-secao-n">{aprovados}/{conferidos.length || v.veredito.itens.length}</span>
        </div>
        <ListaVeredito itens={v.veredito.itens} />

        <div className="av-secao">
          <h2>SaaS citados</h2>
          <span className="av-secao-n">{v.saas.length}</span>
        </div>
        {v.saas.length === 0 ? (
          <p className="av-vazio">Nenhum app citado foi lido ainda. A análise da Cleo olha o vídeo inteiro.</p>
        ) : (
          <ul className="av-saas">
            {v.saas.map((s) => <li key={s.id}><b>{s.nome}</b>{s.dominio && <small>{s.dominio}</small>}</li>)}
          </ul>
        )}
      </aside>
      {salvando && <SalvarEm tipo="video" id={v.id} fechar={() => setSalvando(false)} />}
    </div>
  );
}
