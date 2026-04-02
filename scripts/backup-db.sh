#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

pg_dump "$DATABASE_URL" > "$BACKUP_DIR/supermarket_${TIMESTAMP}.sql"
echo "Backup created: $BACKUP_DIR/supermarket_${TIMESTAMP}.sql"
