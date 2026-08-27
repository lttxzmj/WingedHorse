#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-/opt/wingedhorse/live/.env.production}"
COMPOSE_FILE="/opt/wingedhorse/live/deploy/docker-compose.prod.yml"
backup_dir="${BACKUP_DIR:-/opt/wingedhorse/backups/postgres}"
retention_days="${RETENTION_DAYS:-7}"

# 载入 POSTGRES_* 等变量（.env.production 只含 KEY=VALUE，不 commit 到 Git）
set -a
. "$ENV_FILE"
set +a

stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

PGPASSWORD="$POSTGRES_PASSWORD" docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$backup_dir/wingedhorse-$stamp.sql.gz"

find "$backup_dir" -type f -name 'wingedhorse-*.sql.gz' -mtime "+$retention_days" -delete

echo "Backup created: $backup_dir/wingedhorse-$stamp.sql.gz"
