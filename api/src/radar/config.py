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

    supabase_url: str | None = None
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
