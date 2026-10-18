#!/usr/bin/env bash
# Envoltorio de `docker compose` para producción: siempre el mismo archivo, el
# mismo proyecto y las variables de .env.production (también para interpolar
# ${DATABASE_USER} y compañía dentro del compose).
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: falta ${ENV_FILE}. Cópialo de .env.production.example y completa los secretos." >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"
