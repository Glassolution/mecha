#!/bin/zsh
# Liga o radar no seu Mac: banco, fila, servidor, trabalhador e site.
# Uso: ./rodar.sh   (Ctrl+C desliga tudo)
set -e
cd "$(dirname "$0")"

brew services start postgresql@17 >/dev/null 2>&1 || true
brew services start redis >/dev/null 2>&1 || true

(cd api && uv run python -m radar.migrar)

trap 'kill 0' INT TERM EXIT
(cd api && uv run uvicorn radar.main:app --port 8000 --reload --reload-dir src) &
(cd api && uv run arq radar.trabalhador.Trabalhador) &
(cd web && npm run dev) &

sleep 4
echo ""
echo "radar ligado: abra http://localhost:3000"
wait
