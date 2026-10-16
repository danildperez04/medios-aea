#!/usr/bin/env bash
#
# Respaldo de la base de datos de producción de Medios AeA.
#
# Genera backups/medios_aea_<fecha>.sql.gz y borra los de más de RETENTION_DAYS días.
# Programarlo en cron (ver docs/11-guia-despliegue.md §A.6):
#   0 2 * * * /opt/medios-aea/scripts/backup.sh >> /opt/medios-aea/backups/backup.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
FILENAME="medios_aea_$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p "$BACKUP_DIR"

# --clean --if-exists: el respaldo se puede restaurar sobre una base con datos.
# El usuario y la base se leen dentro del contenedor, no hace falta exportarlos aquí.
./scripts/compose-prod.sh exec -T postgres sh -c \
  'pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# Un respaldo vacío es peor que ninguno: da falsa tranquilidad.
SIZE=$(stat -c%s "${BACKUP_DIR}/${FILENAME}" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
  echo "ERROR: el respaldo ${FILENAME} está vacío (${SIZE} bytes). Se elimina." >&2
  rm -f "${BACKUP_DIR}/${FILENAME}"
  exit 1
fi
echo "$(date '+%F %T') respaldo creado: ${FILENAME} (${SIZE} bytes)"

DELETED=$(find "$BACKUP_DIR" -name 'medios_aea_*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && echo "$(date '+%F %T') rotación: ${DELETED} respaldo(s) antiguo(s) eliminado(s)"
echo "$(date '+%F %T') respaldos disponibles: $(find "$BACKUP_DIR" -name 'medios_aea_*.sql.gz' | wc -l)"
