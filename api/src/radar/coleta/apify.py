"""O que os provedores da Apify têm em comum: iniciar um actor, esperar, ler o resultado.

O token fica só no servidor. Cada busca é uma execução do actor; o Parar aborta a execução.
"""

import asyncio

import httpx

from radar.coleta.base import DeveParar, ErroFonte, Parado

API = "https://api.apify.com/v2"


class ApifyBase:
    rotulo = "a fonte"  # aparece nas mensagens de erro ("O TikTok não respondeu agora…")

    def __init__(self, token: str, actor: str, pausa_s: float = 3.0):
        self._token = token
        self._actor = actor
        self._pausa = pausa_s

    def _cliente(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=API,
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=httpx.Timeout(60, connect=15),
        )

    async def _rodar(self, cli: httpx.AsyncClient, entrada: dict, deve_parar: DeveParar, teto_usd: float | None = None) -> tuple[dict, list[dict]]:
        """Roda o actor e devolve (execução, itens). `teto_usd` limita quanto uma execução pode gastar."""
        params = {"maxTotalChargeUsd": f"{teto_usd:.2f}"} if teto_usd else None
        run = await self._pedir(cli, "POST", f"/acts/{self._actor}/runs", json=entrada, params=params)
        run_id = run["id"]
        try:
            run = await self._esperar(cli, run_id, deve_parar)
        except Parado:
            await self._pedir(cli, "POST", f"/actor-runs/{run_id}/abort")
            raise
        itens = await self._pedir(
            cli, "GET", f"/datasets/{run['defaultDatasetId']}/items", params={"clean": "true", "format": "json"}
        )
        return run, itens

    async def _esperar(self, cli: httpx.AsyncClient, run_id: str, deve_parar: DeveParar) -> dict:
        while True:
            if await deve_parar():
                raise Parado()
            run = await self._pedir(cli, "GET", f"/actor-runs/{run_id}")
            status = run.get("status")
            if status == "SUCCEEDED":
                return run
            if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                raise ErroFonte(f"O {self.rotulo} não respondeu agora. Tente de novo em 1 minuto.")
            await asyncio.sleep(self._pausa)

    async def _pedir(self, cli: httpx.AsyncClient, metodo: str, caminho: str, **kw):
        for tentativa in range(5):
            try:
                r = await cli.request(metodo, caminho, **kw)
            except httpx.HTTPError:
                if tentativa == 4:
                    raise ErroFonte(f"Sem conexão com o provedor do {self.rotulo}. Tente de novo em 1 minuto.")
                await asyncio.sleep(2**tentativa)
                continue
            if r.status_code == 401:
                raise ErroFonte(f"A conexão com o provedor do {self.rotulo} não foi aceita. Avise o suporte.")
            if r.status_code in (402, 403):
                raise ErroFonte(f"O limite de buscas do {self.rotulo} deste mês acabou.")
            if r.status_code == 429 or r.status_code >= 500:
                await asyncio.sleep(2**tentativa)
                continue
            r.raise_for_status()
            corpo = r.json()
            return corpo["data"] if isinstance(corpo, dict) and "data" in corpo else corpo
        raise ErroFonte(f"O {self.rotulo} não respondeu agora. Tente de novo em 1 minuto.")
