# Imagem da API e do trabalhador para rodar na nuvem (Railway). Um contêiner só, os dois processos juntos,
# porque o trabalhador grava as capas e a API serve as mesmas capas do mesmo disco (/data).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

# dependências primeiro: mudar só o código não reinstala tudo
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
COPY iniciar.sh ./
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH" PASTA_DADOS=/data
CMD ["bash", "iniciar.sh"]
