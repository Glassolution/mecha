"""Testes rodam em banco e fila à parte (radar_teste, Redis db 1), nunca nos dados de verdade."""

import os
import tempfile

os.environ["DATABASE_URL"] = "postgresql://localhost/radar_teste"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["AMBIENTE"] = "teste"
os.environ["PASTA_DADOS"] = tempfile.mkdtemp(prefix="radar-teste-")
os.environ["APIFY_TOKEN"] = ""  # os testes nunca chamam o provedor de verdade
os.environ["SUPABASE_URL"] = "https://teste.supabase.co"  # tokens assinados por uma chave de teste
os.environ["DONOS"] = "dono@teste.com"

import httpx  # noqa: E402
import pytest  # noqa: E402

from radar import db, fluxo  # noqa: E402
from radar.coleta.base import ResultadoBusca, VideoBruto  # noqa: E402
from radar.main import app  # noqa: E402
from radar.migrar import migrar  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def banco():
    await migrar(os.environ["DATABASE_URL"])
    await db.abrir(os.environ["DATABASE_URL"])
    yield
    await db.fechar()


@pytest.fixture(autouse=True)
async def limpo():
    await db.executar(
        """truncate videos, metricas_hist, busca_cache, contas, sessoes, espacos, membros, garimpos,
           garimpo_videos, colecoes, salvos, uso, avaliacoes, video_saas, saas cascade"""
    )
    await fluxo.redis().flushdb()
    yield


@pytest.fixture
async def cliente():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as c:
        r = await c.post("/api/dev/entrar", json={"nome": "Espaço de teste"})
        assert r.status_code == 200
        yield c


def video_simulado(n: int, **extra) -> VideoBruto:
    base = dict(
        id=f"tt:sim{n}", fonte="tiktok", tipo_item="post",
        url_original=f"https://www.tiktok.com/@simulado/video/sim{n}",
        idioma="en", autor=f"@criador{n % 3}", texto=f"[SIMULADO] This AI tool does my notes #{n}",
        hashtags=["aitools"], views=100_000 * (n + 1), likes=5_000, compartilhamentos=800, salvamentos=900,
        duracao_s=30, largura=720, altura=1280, vertical=True,
        transcricao="[SIMULADO] I use this app every day", transcricao_tempos=[[0, 0]], legenda_fonte="ASR",
    )
    base.update(extra)
    return VideoBruto(**base)


class ColetorSimulado:
    """Provedor falso: devolve vídeos simulados e conta quantas vezes foi chamado."""

    nome = "simulado"

    def __init__(self, por_busca: int = 3, erro: Exception | None = None):
        self.chamadas: list[tuple[str, str]] = []
        self.por_busca = por_busca
        self.erro = erro

    async def buscar(self, termo, idioma, limite, deve_parar):
        self.chamadas.append((termo, idioma))
        if self.erro:
            raise self.erro
        inicio = len(self.chamadas) * 10
        return ResultadoBusca([video_simulado(inicio + i, idioma=idioma) for i in range(self.por_busca)], custo_usd=0.01)
