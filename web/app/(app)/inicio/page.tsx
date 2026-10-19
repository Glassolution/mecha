"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { capaUrl } from "@/lib/fmt";
import { iniciarGarimpo, separarTermos, ErroApi } from "@/lib/garimpo";
import { useApp } from "@/components/Contexto";
import { Icone } from "@/components/Icone";

type Resumo = {
  videos_total: number;
  videos_semana: number;
  transcritos: number;
  capas: string[];
  ultimo_garimpo: { id: string; termos: string[]; status: string; vistos: number } | null;
};
type Nicho = { id: string; rotulo: string };

export default function Inicio() {
  const router = useRouter();
  const { eu } = useApp();
  const { dados: resumo } = useApi<Resumo>("/api/resumo");
  const { dados: nichos } = useApi<Nicho[]>("/api/nichos");
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"ideia" | "criativo">(eu?.espaco.interesse === "achar_criativo" ? "criativo" : "ideia");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ mensagem: string; botao?: string } | null>(null);

  const nicho = eu?.espaco.nichos[0];
  const nichoRotulo = nichos?.find((n) => n.id === nicho)?.rotulo;
  const termos = separarTermos(texto);

  async function garimpar() {
    if (!termos.length || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const id = await iniciarGarimpo({ termos, modo, idiomas: eu?.espaco.ver_ingles === false ? ["pt"] : ["pt", "en"] });
      router.push(`/garimpo/${id}`);
    } catch (e) {
      const err = e as ErroApi;
      setErro({ mensagem: err.message, botao: err.dados?.botao });
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="inicio-hero">
        {resumo && resumo.videos_total > 0 && (
          <Link href="/ideias?modo=criativo&ordem=recentes" className="pilula-novidade">
            <span>
              <b>{resumo.videos_semana.toLocaleString("pt-BR")}</b> vídeos novos na biblioteca esta semana
            </span>
            <span className="ver">Ver</span>
          </Link>
        )}
        {resumo && resumo.capas.length === 3 && (
          <div className="leque" style={{ width: 260, height: 190, margin: "0 0 18px" }} aria-hidden="true">
            {resumo.capas.map((c) => (
              <div key={c} style={{ width: 96 }}>
                <img src={capaUrl(c)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}
        <h1 className="titulo-pagina">
          {eu ? `${eu.espaco.nome} está pronto para garimpar` : "Pronto para garimpar"}
          <br />
          <span className="fraco">O que você quer achar hoje?</span>
        </h1>

        <div className="caixa-grande">
          <label className="oculto" htmlFor="caixa">Um nicho ou problema</label>
          <textarea
            id="caixa"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                garimpar();
              }
            }}
            placeholder="Um nicho ou problema. Ex.: medicina, advogados, agenda de salão"
            rows={2}
          />
          <div className="caixa-acoes">
            <button className="chip" aria-pressed={modo === "ideia"} onClick={() => setModo("ideia")}>
              <Icone nome="ideia" tamanho={15} /> Achar ideia
            </button>
            <button className="chip" aria-pressed={modo === "criativo"} onClick={() => setModo("criativo")}>
              <Icone nome="play" tamanho={15} /> Achar criativo
            </button>
            {termos.length > 1 && <span className="fraco" style={{ fontSize: 13 }}>{termos.length} palavras</span>}
            <button className="enviar" onClick={garimpar} disabled={!termos.length || enviando} aria-label="Garimpar estas palavras">
              <Icone nome="cima" tamanho={20} traco={2.2} />
            </button>
          </div>
        </div>
        <p className="fraco" style={{ fontSize: 13, marginTop: 10 }}>
          Separe várias palavras com vírgula. Cada uma é buscada no TikTok, no idioma dela.
        </p>
        {erro && (
          <div className="erro-caixa" role="alert" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <span>{erro.mensagem}</span>
            {erro.botao && <Link href="/config#plano" className="bt1 bt-p">{erro.botao}</Link>}
          </div>
        )}
      </section>

      <section className="proximos" aria-label="Próximos passos">
        <Link href={nicho ? `/ideias?nicho=${nicho}` : "/ideias"} className="proximo">
          <Icone nome="sobe" tamanho={22} />
          <h3>As ideias em alta {nichoRotulo ? `em ${nichoRotulo}` : "agora"}</h3>
          <p className="suave">Ordenadas por atenção, tendência e número de criadores.</p>
          <span className="ir">Ver ideias <Icone nome="direita" tamanho={16} /></span>
        </Link>
        <Link href="/ideias?prateleira=fora" className="proximo">
          <span style={{ fontSize: 22 }} aria-hidden="true">🌎</span>
          <h3>Bombando lá fora, sem versão no Brasil</h3>
          <p className="suave">O ângulo mais forte para quem vai construir em português.</p>
          <span className="ir">Ver a prateleira <Icone nome="direita" tamanho={16} /></span>
        </Link>
        {resumo?.ultimo_garimpo ? (
          <Link href={`/garimpo/${resumo.ultimo_garimpo.id}`} className="proximo">
            <Icone nome="radar" tamanho={22} />
            <h3>Continuar o último garimpo</h3>
            <p className="suave">
              “{resumo.ultimo_garimpo.termos.slice(0, 3).join("”, “")}” · {resumo.ultimo_garimpo.vistos} vídeos
            </p>
            <span className="ir">Abrir <Icone nome="direita" tamanho={16} /></span>
          </Link>
        ) : (
          <Link href="/garimpo" className="proximo">
            <Icone nome="radar" tamanho={22} />
            <h3>Fazer o primeiro garimpo</h3>
            <p className="suave">Escolha palavras do seu nicho e veja os vídeos chegando ao vivo.</p>
            <span className="ir">Montar garimpo <Icone nome="direita" tamanho={16} /></span>
          </Link>
        )}
      </section>
    </>
  );
}
