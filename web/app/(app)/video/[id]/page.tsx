"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { capaUrl, IDIOMA, num, PLATAFORMA, quando, tiktokId } from "@/lib/fmt";
import type { FichaVideo } from "@/lib/tipos";
import { ListaVeredito, playerTikTok, primeiraLinha, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";
import { SalvarEm } from "@/components/SalvarEm";

export default function FichaDoVideo() {
  const { id } = useParams<{ id: string }>();
  const videoId = decodeURIComponent(id);
  const router = useRouter();
  const { avisar } = useApp();
  const { dados: v, erro } = useApi<FichaVideo>(`/api/videos/${encodeURIComponent(videoId)}`);
  const [salvando, setSalvando] = useState(false);

  function voltar() {
    if (window.history.length > 1) router.back();
    else router.push("/ideias?modo=criativo");
  }

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.querySelector(".fundo-janela")) voltar();
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  if (erro) return <Vazio titulo="Vídeo não encontrado." texto="Ele pode ter saído da biblioteca." acao={<Link className="bt1" href="/ideias?modo=criativo">Ver outros vídeos</Link>} />;
  if (!v) return <div className="esqueleto" style={{ height: 600 }} />;

  const tt = tiktokId(v.id);
  const titulo = v.gancho ?? primeiraLinha(v.texto_completo);
  const tudoEspera = v.veredito.itens.some((i) => i.ok === null);

  async function copiar() {
    await navigator.clipboard.writeText(titulo);
    avisar("Gancho copiado");
  }

  return (
    <>
      <button className="bt3" onClick={voltar} style={{ marginBottom: 16 }}>
        <Icone nome="voltar" /> Voltar
      </button>
      <div className="ficha">
        <div className="ficha-player">
          {tt ? (
            <iframe src={playerTikTok(tt, true)} title={`Vídeo de ${v.autor}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
          ) : v.capa ? (
            <img src={capaUrl(v.capa)!} alt="" />
          ) : (
            <div className="capa-vazia" />
          )}
        </div>

        <div>
          <div className="chips" style={{ marginBottom: 14 }}>
            <span className="selo">{PLATAFORMA[v.fonte] ?? v.fonte}</span>
            <span className="selo">{v.metrica}</span>
            {v.idioma && <span className="selo">{IDIOMA[v.idioma] ?? v.idioma}</span>}
            {v.duracao_s !== null && <span className="selo">{v.duracao_s} s</span>}
            {v.vertical !== null && <span className="selo">{v.vertical ? "Vertical" : "Deitado"}</span>}
            {v.publicado && <span className="selo">Postado {quando(v.publicado)}</span>}
          </div>
          <h1>{titulo}</h1>
          <p className="suave" style={{ marginTop: 8 }}>
            {v.autor_nome ? `${v.autor_nome} · ` : ""}{v.autor}{v.autor_seguidores ? ` · ${num(v.autor_seguidores)} seguidores` : ""}
          </p>

          <div className="acoes">
            <button className="bt1" onClick={() => setSalvando(true)}><Icone nome="salvo" /> Salvar em…</button>
            <a className="bt2" href={v.url_original} target="_blank" rel="noopener noreferrer"><Icone nome="abrir" /> Abrir no {PLATAFORMA[v.fonte] ?? "site"}</a>
            <button className="bt2" onClick={copiar}><Icone nome="copiar" /> Copiar o gancho</button>
            <button className="bt2" disabled title="Chega com o Estúdio"><Icone nome="estudio" /> Levar ao Estúdio</button>
          </div>

          <div className="dados" style={{ marginBottom: 24 }}>
            {[
              ["Views", v.views], ["Curtidas", v.likes], ["Comentários", v.comentarios],
              ["Compartilhamentos", v.compartilhamentos], ["Salvamentos", v.salvamentos],
            ].map(([r, n]) => (
              <div key={r as string} className="dado"><div className="r">{r}</div><div className="v">{num(n as number | null)}</div></div>
            ))}
            <div className="dado"><div className="r">Prova (0–100)</div><div className="v">{v.prova ?? "—"}</div></div>
          </div>

          <section className="painel" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, marginBottom: 6 }}>
              {v.veredito.passa ? "Por que o radar aprovou" : tudoEspera ? "Como ele vai no filtro" : "Por que não passou"}
            </h2>
            <p className="fraco" style={{ fontSize: 13, marginBottom: 8 }}>Filtro Achar criativo: atenção média, gancho forte, vertical, 4 a 60 s.</p>
            <ListaVeredito itens={v.veredito.itens} />
            {tudoEspera && (
              <p className="fraco" style={{ fontSize: 13, marginTop: 10 }}>
                <Icone nome="relogio" tamanho={13} /> Os critérios de gancho, demonstração e troca chegam com o avaliador.
              </p>
            )}
          </section>

          <section className="painel" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>SaaS citados</h2>
            {v.saas.length === 0 ? (
              <p className="suave">
                O leitor de SaaS ainda não foi ligado. Quando entrar, cada app citado aparece aqui com o trecho e o segundo em que aparece.
              </p>
            ) : (
              <ul className="veredito">
                {v.saas.map((s) => (
                  <li key={s.id}><b>{s.nome}</b>{s.dominio && <span className="fraco">{s.dominio}</span>}<span className="fraco">“{s.trecho}”</span></li>
                ))}
              </ul>
            )}
          </section>

          <details className="recolhido" style={{ marginBottom: 10 }}>
            <summary>Legenda do post <Icone nome="baixo" /></summary>
            <div>{v.texto_completo || "Sem legenda."}</div>
          </details>
          <div className="painel-p" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
            <Icone nome="fala" />
            {v.transcricao_chars > 0 ? (
              <span>
                Fala captada pela legenda do TikTok ({v.legenda_fonte === "ASR" ? "fala original" : "tradução automática"}). Usada só para achar os SaaS citados.
              </span>
            ) : (
              <span className="suave">Este vídeo não tem legenda do TikTok. O radar usa a legenda do post e a capa.</span>
            )}
          </div>
          <p className="fraco" style={{ fontSize: 13, marginTop: 14 }}>
            Visto pela primeira vez {quando(v.visto_primeiro)} · palavras: {v.termos.join(", ")}
          </p>
        </div>
      </div>
      {salvando && <SalvarEm tipo="video" id={v.id} fechar={() => setSalvando(false)} />}
    </>
  );
}
