#!/bin/bash
# Liga a API e o trabalhador no servidor. Se um dos dois cair, o contêiner para e a Railway religa tudo.
set -e

python -m radar.migrar

arq radar.trabalhador.Trabalhador &
uvicorn radar.main:app --host :: --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips '*' &

wait -n
exit 1
