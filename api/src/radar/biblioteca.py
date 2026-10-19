"""Biblioteca compartilhada: gravar vídeos (sem nunca apagar campo) e montar o cartão para a tela."""

import json
from dataclasses import asdict
from datetime import date

from psycopg import AsyncConnection

from radar.armazenamento import url_capa
from radar.coleta.base import VideoBruto
from radar.coleta.regras import tem_sinal_software
from radar.notas import avalia_video, fmt_num, prova_organico

# colunas que o envio parcial completa sem apagar o que já havia
_COLUNAS = [
    "fonte", "tipo_item", "url_original", "idioma", "autor", "autor_nome", "autor_seguidores", "texto",
    "transcricao", "transcricao_tempos", "legenda_fonte", "capa_origem", "video_url",
    "views", "likes", "comentarios", "compartilhamentos", "salvamentos",
    "duracao_s", "largura", "altura", "vertical", "publicado", "sinal_software",
]


async def gravar_video(con: AsyncConnection, v: VideoBruto, termo: str) -> bool:
    """Insere ou completa o vídeo. Devolve True se o vídeo é novo na biblioteca."""
    dados = asdict(v)
    dados["sinal_software"] = tem_sinal_software(v.texto, v.transcricao, " ".join(v.hashtags))
    dados["transcricao_tempos"] = json.dumps(v.transcricao_tempos) if v.transcricao_tempos else None
    valores = [dados[c] for c in _COLUNAS]
    atualiza = ", ".join(f"{c} = coalesce(excluded.{c}, videos.{c})" for c in _COLUNAS)
    cur = await con.execute(
        f"""
        insert into videos (id, {", ".join(_COLUNAS)}, hashtags, termos)
        values (%s, {", ".join(["%s"] * len(_COLUNAS))}, %s, %s)
        on conflict (id) do update set {atualiza},
          hashtags = case when cardinality(excluded.hashtags) > 0 then excluded.hashtags else videos.hashtags end,
          termos = (select array(select distinct unnest(videos.termos || excluded.termos))),
          visto_ultimo = now()
        returning (xmax = 0) as novo
        """,
        [v.id, *valores, v.hashtags, [termo]],
    )
    novo = (await cur.fetchone())["novo"]
    if v.views is not None:
        await con.execute(
            """insert into metricas_hist (video_id, dia, views, likes) values (%s, %s, %s, %s)
               on conflict (video_id, dia) do update set views = excluded.views, likes = excluded.likes""",
            (v.id, date.today(), v.views, v.likes),
        )
    return novo


def _metrica(v: dict) -> str:
    if v["fonte"] in ("tiktok", "youtube", "instagram"):
        return f"{fmt_num(v.get('views'))} views"
    if v["fonte"] == "tiktok_ads":
        return f"{fmt_num(v.get('likes'))} curtidas"
    return f"{v.get('dias_no_ar') or 0} dias no ar"


def cartao(v: dict, bloqueado: bool = False) -> dict:
    """O que a tela precisa para um cartão 9:16. Bloqueado (plano grátis) leva só a capa."""
    if bloqueado:
        return {"id": v["id"], "bloqueado": True, "capa": url_capa(v.get("capa_path"))}
    texto = (v.get("texto") or "").strip()
    return {
        "id": v["id"],
        "fonte": v["fonte"],
        "capa": url_capa(v.get("capa_path")),
        "autor": v.get("autor"),
        "autor_nome": v.get("autor_nome"),
        "texto": texto[:160],
        "gancho": (v.get("avaliacao") or {}).get("gancho"),
        "idioma": v.get("idioma"),
        "views": v.get("views"),
        "likes": v.get("likes"),
        "metrica": _metrica(v),
        "duracao_s": v.get("duracao_s"),
        "vertical": v.get("vertical"),
        "transcrito": bool(v.get("transcricao")),
        "sinal_software": v.get("sinal_software"),
        "publicado": v.get("publicado"),
        "url_original": v["url_original"],
        "prova": prova_organico(v.get("views"), v.get("compartilhamentos"), v.get("salvamentos")),
        "nota": (v.get("avaliacao") or {}).get("nota"),
    }


def ficha(v: dict, criterios: dict | None = None) -> dict:
    """A ficha do vídeo: cartão + legenda, transcrição e o veredito por critério."""
    return {
        **cartao(v),
        "texto_completo": v.get("texto"),
        "hashtags": v.get("hashtags") or [],
        # regra 2 da seção 14: a transcrição não vai para a tela; só o trecho do SaaS citado
        "transcricao_chars": len(v.get("transcricao") or ""),
        "legenda_fonte": v.get("legenda_fonte"),
        "autor_seguidores": v.get("autor_seguidores"),
        "comentarios": v.get("comentarios"),
        "compartilhamentos": v.get("compartilhamentos"),
        "salvamentos": v.get("salvamentos"),
        "largura": v.get("largura"),
        "altura": v.get("altura"),
        "visto_primeiro": v.get("visto_primeiro"),
        "visto_ultimo": v.get("visto_ultimo"),
        "termos": v.get("termos") or [],
        "saas": v.get("saas") or [],
        "veredito": avalia_video(v, criterios),
    }


SELECT_VIDEO = """
    select v.*, to_jsonb(a) - 'video_id' as avaliacao
    from videos v left join avaliacoes a on a.video_id = v.id
"""
