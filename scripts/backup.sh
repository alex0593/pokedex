#!/usr/bin/env bash
# scripts/backup.sh — dump de PostgreSQL vía Docker Compose.
#
# Uso:
#   bash scripts/backup.sh             # crea backup en ./backups/
#   bash scripts/backup.sh --keep 14   # conservar 14 backups (default: 7)
#
# Para automatizar con cron (ejemplo: diario a las 02:00):
#   0 2 * * * cd /ruta/al/proyecto && bash scripts/backup.sh >> /var/log/pokedex-backup.log 2>&1
# ---------------------------------------------------------------------------
set -euo pipefail

# --- Configuración -------------------------------------------------------
KEEP=7
COMPOSE_SERVICE="postgres"
DB_USER="${POSTGRES_USER:-pokedex_user}"
DB_NAME="${POSTGRES_DB:-pokedex}"
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"

# Parsear argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep) KEEP="$2"; shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

# --- Backup ---------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pokedex_${TIMESTAMP}.sql.gz"

echo "[$(date +%T)] Iniciando backup → $BACKUP_FILE"

docker compose exec -T "$COMPOSE_SERVICE" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date +%T)] Backup completado — $SIZE"

# --- Rotación (conservar solo los últimos N) ------------------------------
TOTAL=$(ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
if [ "$TOTAL" -gt "$KEEP" ]; then
  TO_DELETE=$((TOTAL - KEEP))
  ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n "$TO_DELETE" | xargs rm -f
  echo "[$(date +%T)] Eliminados $TO_DELETE backups antiguos (se conservan $KEEP)."
fi

echo "[$(date +%T)] Listo. Backups disponibles: $(ls -1 "$BACKUP_DIR"/*.sql.gz | wc -l)"
