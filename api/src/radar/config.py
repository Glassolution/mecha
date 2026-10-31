"""Configuração lida do .env da raiz do projeto. Chaves ficam só aqui, no servidor."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ = Path(__file__).resolve().parents[3]  # .../projeto saas


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=RAIZ / ".env", extra="ignore")

    ambiente: str = "dev"  # dev | teste | producao
    database_url: str = "postgresql://localhost/radar"
    # conexões abertas por processo (API e trabalhador têm um pool cada); o pooler grátis do Supabase aguenta poucas
    db_conexoes: int = 10
    redis_url: str = "redis://localhost:6379/0"
    pasta_dados: Path = RAIZ / "data"

    apify_token: SecretStr | None = None
    apify_actor: str = "clockworks~tiktok-scraper"
    apify_actor_instagram: str = "apify~instagram-hashtag-scraper"
    # Reels mais velhos que isto ficam de fora (o Instagram não deixa pedir só os recentes)
    instagram_max_dias: int = 365
    # vídeos por busca e por hashtag em cada palavra (cada vídeo custa ~US$ 0,0037)
    resultados_por_busca: int = 12
    buscar_hashtag: bool = True

    # IA: análise "vale criar um SaaS?", conversa e analista de oportunidades, todos no Gemini
    gemini_api_key: SecretStr | None = None
    modelo_analise: str = "gemini-3.5-flash"
    modelo_oportunidades: str = "gemini-3.5-flash"
    # preço do gemini-3.5-flash (out/2026): por 1 milhão de tokens e por busca na web
    gemini_usd_entrada_milhao: float = 1.50
    gemini_usd_saida_milhao: float = 9.00
    gemini_usd_por_busca: float = 0.014
    # triagem da busca (modo Achar ideia): nota de 0 a 100 pelos critérios de radar.criterios;
    # vídeos abaixo disto ficam de fora
    triagem_ligada: bool = True
    nota_minima_saas: int = 60
    # por enquanto as buscas e as listas de vídeos ficam só em português do Brasil
    so_portugues: bool = True
    # vitrine da página Ideias: busca automática semanal (~US$ 0,15 por palavra nas duas fontes)
    vitrine_ligada: bool = True
    vitrine_termos_por_semana: int = 5
    analises_por_dia: int = 30
    mensagens_chat_por_dia: int = 60

    # analista de oportunidades: comentários dos vídeos com mais views, buscados só quando pedem a análise
    oportunidades_por_dia: int = 10
    oportunidades_videos: int = 8
    comentarios_por_video: int = 15
    actor_comentarios_tiktok: str = "clockworks~tiktok-comments-scraper"
    actor_comentarios_instagram: str = "apify~instagram-comment-scraper"

    supabase_url: str | None = None
    # chave secreta (sb_secret_…) só para guardar as capas no Storage; sem ela, as capas ficam em disco (pasta_dados)
    supabase_secret_key: SecretStr | None = None
    # e-mails dos donos: no primeiro login ficam com o espaço de desenvolvimento e o plano Pro
    donos: str = ""

    site_url: str = "http://localhost:3000"
    cookie_seguro: bool = False  # True em produção (HTTPS)

    @property
    def pasta_capas(self) -> Path:
        return self.pasta_dados / "capas"


@lru_cache
def config() -> Config:
    return Config()
