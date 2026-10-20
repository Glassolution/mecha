"""API do Radar. Uso: uv run uvicorn radar.main:app --port 8000"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from radar import db
from radar.rotas import biblioteca, conta, garimpos, publico, salvos

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def vida(app: FastAPI):
    await db.abrir()
    yield
    await garimpos.fechar_fila()
    await db.fechar()


app = FastAPI(title="Radar", lifespan=vida, docs_url=None, redoc_url=None, openapi_url=None)
for modulo in (conta, garimpos, biblioteca, salvos, publico):
    app.include_router(modulo.r)


@app.exception_handler(HTTPException)
async def erro_http(request: Request, exc: HTTPException):
    detalhe = exc.detail if isinstance(exc.detail, dict) else {"mensagem": exc.detail}
    return JSONResponse(detalhe, status_code=exc.status_code)


@app.get("/api/saude")
async def saude():
    await db.um("select 1")
    return {"ok": True}
