#!/usr/bin/env bash
#
# Restaura la base de datos de producción desde un respaldo.
#
#   ./scripts/restore.sh backups/medios_aea_20261016_020000.sql.gz
#
# SOBRESCRIBE los datos actuales. Haz un respaldo antes si hay algo que conservar.
# Para automatizar (pruebas), RESTORE_CONFIRM=s evita la pregunta.

set -euo pipefail
cd "$(dirname "$0")/.."

usage() {
  echo "Uso: $0 <archivo.sql.gz>"
  echo "Sobrescribe la base de producción con el respaldo. RESTORE_CONFIRM=s evita la pregunta."
}

# Un solo argumento, que sea un archivo: una opción (--help, un tipeo) nunca se toma
# como nombre de respaldo, y tampoco se ignoran argumentos de más.
case "${1:-}" in
  -h | --help)
    usage
    exit 0
    ;;
  -*)
    echo "ERROR: opción desconocida: $1" >&2
    usage >&2
    exit 2
    ;;
esac
if [ "$#" -gt 1 ]; then
  echo "ERROR: $0 recibe un solo archivo (recibió $# argumentos)." >&2
  usage >&2
  exit 2
fi

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  usage >&2
  echo "Respaldos disponibles:" >&2
  ls -1 backups/medios_aea_*.sql.gz 2>/dev/null >&2 || echo "  (ninguno)" >&2
  exit 1
fi

CONFIRM="${RESTORE_CONFIRM:-}"
if [ -z "$CONFIRM" ]; then
  read -r -p "Se sobrescribirán TODOS los datos actuales con ${BACKUP_FILE}. ¿Continuar? [s/N] " CONFIRM
fi
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "Cancelado."
  exit 1
fi

echo "Deteniendo la API para que no escriba durante la restauración..."
./scripts/compose-prod.sh stop api

echo "Restaurando ${BACKUP_FILE}..."
# ON_ERROR_STOP: ante el primer error se detiene en vez de dejar una base a medias.
gunzip -c "$BACKUP_FILE" | ./scripts/compose-prod.sh exec -T postgres sh -c \
  'psql --quiet -v ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' >/dev/null

echo "Levantando la API..."
./scripts/compose-prod.sh up -d api
echo "Restauración completada. Revisa el estado con: pnpm prod:ps"
