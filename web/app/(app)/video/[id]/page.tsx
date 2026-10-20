"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { capaUrl, ICONE_FONTE, IDIOMA, instagramCodigo, num, PLATAFORMA, quando, tiktokId } from "@/lib/fmt";
import type { FichaVideo } from "@/lib/tipos";
import { ListaVeredito, playerTikTok, primeiraLinha, Vazio } from "@/components/Cartoes";
import { useApp } from "@/components/Contexto";
import { Desempenho } from "@/components/Desempenho";
import { Icone } from "@/components/Icone";
import { Revela } from "@/components/Movimento";
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

export default function FichaDoVideo() {
  const { id } = useParams<{ id: string }>();
  const videoId = decodeURIComponent(id);
  const router = useRouter();
  const { avisar } = useApp();
  const { dados: v, erro } = useApi<FichaVideo>(`/api/videos/${encodeURIComponent(videoId)}`);
  const [salvando, setSalvando] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function voltar() {
    if (window.history.length > 1) router.back();
    else router.push("/inicio");
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (menu) setMenu(false);
      else if (!document.querySelector(".fundo-janela")) voltar();
    }
    function fora(e: MouseEvent) {
      if (menu && !menuRef.current?.contains(e.target as Node)) setMenu(false);
    }
    window.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fora);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  });

  if (erro) return <Vazio titulo="Vídeo não encontrado." texto="Ele pode ter saído da biblioteca." acao={<Link className="bt1" href="/inicio">Voltar ao início</Link>} />;
  if (!v) return <div className="esqueleto" style={{ height: 600, marginTop: 24 }} />;

  const tt = tiktokId(v.id);
  const ig = instagramCodigo(v.id);
  const titulo = v.gancho ?? primeiraLinha(v.texto_completo);
  const conferidos = v.veredito.itens.filter((i) => i.ok !== null);
  const aprovados = conferidos.filter((i) => i.ok).length;
  const aguardando = v.veredito.itens.length - conferidos.length;
  const frases = leitura(v);
  const meta = [
    PLATAFORMA[v.fonte] ?? v.fonte,
    v.idioma ? IDIOMA[v.idioma] ?? v.idioma : null,
    v.duracao_s ? `${v.duracao_s} s` : null,
    v.publicado ? `postado ${quando(v.publicado)}` : null,
  ].filter(Boolean);

  async function copiar(texto: string, aviso: string) {
    await navigator.clipboard.writeText(texto);
    setMenu(false);
    avisar(aviso);
  }

  return (
    <>
      <button className="fv-voltar" onClick={voltar}>
        <Icone nome="voltar" tamanho={16} /> Voltar
      </button>

      <div className="fv">
        <div className="fv-player">
          <div className="fv-moldura">
            {tt ? (
              <iframe src={playerTikTok(tt, true)} title={`Vídeo de ${v.autor}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            ) : ig ? (
              // player oficial do Instagram (o vídeo nunca é copiado)
              <iframe className="fv-instagram" src={`https://www.instagram.com/reel/${ig}/embed/`} title={`Reel de ${v.autor}`}
                allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            ) : v.capa ? (
              <img src={capaUrl(v.capa)!} alt="" />
            ) : (
              <div className="capa-vazia" />
            )}
          </div>
        </div>

        <div className="fv-conteudo">
          <Revela className="fv-meta" i={0}>
            {meta.map((m, n) => (
              <span key={n}>{n === 0 && <Icone nome={ICONE_FONTE[v.fonte] ?? "play"} tamanho={13} />}{m}</span>
            ))}
          </Revela>

          <Revela as="h1" className="fv-titulo" i={1}>{titulo}</Revela>

          <Revela className="fv-autor" i={2}>
            <span className="fv-avatar" aria-hidden="true">{(v.autor_nome || v.autor || "?").replace("@", "").slice(0, 1).toUpperCase()}</span>
            <span>
              <b>{v.autor_nome || v.autor}</b>
              <span className="fraco">{v.autor}{v.autor_seguidores ? ` · ${num(v.autor_seguidores)} seguidores` : ""}</span>
            </span>
          </Revela>

          <Revela className="fv-acoes" i={3}>
            <button className="bt1" onClick={() => setSalvando(true)}><Icone nome="salvo" tamanho={16} /> Salvar</button>
            <a className="bt2" href={v.url_original} target="_blank" rel="noopener noreferrer"><Icone nome="abrir" tamanho={16} /> Abrir no {PLATAFORMA[v.fonte] ?? "site"}</a>
            <div className="fv-mais" ref={menuRef}>
              <button className="bt2 fv-mais-bt" aria-haspopup="menu" aria-expanded={menu} aria-label="Mais ações" onClick={() => setMenu((m) => !m)}>
                <Icone nome="mais_h" tamanho={18} />
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <button className="menu-item" role="menuitem" onClick={() => copiar(titulo, "Gancho copiado")}><Icone nome="copiar" tamanho={16} /> Copiar o gancho</button>
                  <button className="menu-item" role="menuitem" onClick={() => copiar(v.url_original, "Link copiado")}><Icone nome="link" tamanho={16} /> Copiar o link</button>
                  <button className="menu-item" role="menuitem" disabled style={{ opacity: 0.5 }}><Icone nome="estudio" tamanho={16} /> Levar ao Estúdio <span className="fraco" style={{ marginLeft: "auto", fontSize: 12 }}>em breve</span></button>
                </div>
              )}
            </div>
          </Revela>

          <Revela as="section" className="fv-cartao fv-numeros" i={4} aria-label="Desempenho">
            <Desempenho
              views={v.views}
              viewsDia={v.views_dia}
              likes={v.likes}
              comentarios={v.comentarios}
              compartilhamentos={v.compartilhamentos}
              salvamentos={v.salvamentos}
              publicado={v.publicado}
            />
          </Revela>

          {frases.length > 0 && (
            <Revela as="section" className="fv-cartao" i={5} aria-label="Leitura rápida">
              <h2 className="fv-h2">Leitura rápida</h2>
              <ul className="fv-leitura">
                {frases.map((f, n) => (
                  <li key={n}><span className="fv-leitura-icone"><Icone nome={f.icone} tamanho={15} /></span><p>{f.texto}</p></li>
                ))}
              </ul>
            </Revela>
          )}

          <Revela className="fv-dobras" i={6}>
            <details className="fv-dobra">
              <summary>
                <span>Dá para refazer?</span>
                <span className="fraco">{aprovados} ok{conferidos.length - aprovados ? ` · ${conferidos.length - aprovados} não` : ""}{aguardando ? ` · ${aguardando} aguardando avaliação` : ""}</span>
                <Icone nome="baixo" tamanho={16} />
              </summary>
              <div className="fv-dobra-corpo">
                <ListaVeredito itens={v.veredito.itens} />
              </div>
            </details>
            <details className="fv-dobra">
              <summary>
                <span>SaaS citados</span>
                <span className="fraco">{v.saas.length ? `${v.saas.length}` : "chega com o leitor de SaaS"}</span>
                <Icone nome="baixo" tamanho={16} />
              </summary>
              <div className="fv-dobra-corpo">
                {v.saas.length === 0 ? (
                  <p className="suave">Quando o leitor de SaaS for ligado, cada app citado aparece aqui com o trecho e o segundo em que aparece.</p>
                ) : (
                  <ul className="veredito">
                    {v.saas.map((s) => (
                      <li key={s.id}><b>{s.nome}</b>{s.dominio && <span className="fraco">{s.dominio}</span>}<span className="fraco">“{s.trecho}”</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
            <details className="fv-dobra">
              <summary>
                <span>Legenda do post</span>
                <span className="fraco">{v.hashtags.length ? `${v.hashtags.length} hashtags` : ""}</span>
                <Icone nome="baixo" tamanho={16} />
              </summary>
              <div className="fv-dobra-corpo fv-legenda">{v.texto_completo || "Sem legenda."}</div>
            </details>
          </Revela>

          <p className="fv-rodape">
            {v.transcricao_chars > 0
              ? `Fala captada pela legenda do TikTok (${v.legenda_fonte === "ASR" ? "fala original" : "tradução automática"}).`
              : v.fonte === "instagram" ? "O Instagram não traz a fala do vídeo; a leitura usa a legenda do post." : "Sem legenda falada do TikTok."}{" "}
            Achado com “{v.termos.join("”, “")}” · visto pela primeira vez {quando(v.visto_primeiro)}.
          </p>
        </div>
      </div>
      {salvando && <SalvarEm tipo="video" id={v.id} fechar={() => setSalvando(false)} />}
    </>
  );
}
