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
    redis_url: str = "redis://localhost:6379/0"
    pasta_dados: Path = RAIZ / "data"

    apify_token: SecretStr | None = None
    apify_actor: str = "clockworks~tiktok-scraper"
    # vídeos por busca e por hashtag em cada palavra (cada vídeo custa ~US$ 0,0037)
    resultados_por_busca: int = 12
    buscar_hashtag: bool = True

    site_url: str = "http://localhost:3000"
    cookie_seguro: bool = False  # True em produção (HTTPS)

    @property
    def pasta_capas(self) -> Path:
        return self.pasta_dados / "capas"


@lru_cache
def config() -> Config:
    return Config()
