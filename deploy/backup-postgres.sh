#!/bin/sh
set -eu
umask 077

ENV_FILE="${ENV_FILE:-/opt/wingedhorse/current/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/wingedhorse/current/deploy/docker-compose.prod.yml}"
backup_dir="${BACKUP_DIR:-/opt/wingedhorse/backups/postgres}"
retention_days="${RETENTION_DAYS:-7}"

case "$retention_days" in
  ''|*[!0-9]*) echo "RETENTION_DAYS must be a non-negative integer" >&2; exit 2 ;;
esac

env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }
POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
[ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] || {
  echo "POSTGRES_USER and POSTGRES_DB are required" >&2
  exit 2
}

stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
tmp_sql="$(mktemp "$backup_dir/.wingedhorse-$stamp.XXXXXX.sql")"
tmp_gz="$tmp_sql.gz"
archive="$backup_dir/wingedhorse-$stamp.sql.gz"
checksum_tmp="$archive.sha256.partial"
committed=0
cleanup() {
  rm -f "$tmp_sql" "$tmp_gz" "$checksum_tmp"
  if [ "$committed" -ne 1 ]; then rm -f "$archive" "$archive.sha256"; fi
}
trap cleanup EXIT HUP INT TERM

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$tmp_sql"
test -s "$tmp_sql"
gzip -c "$tmp_sql" > "$tmp_gz"
gzip -t "$tmp_gz"
mv "$tmp_gz" "$archive"
sha256sum "$archive" > "$checksum_tmp"
mv "$checksum_tmp" "$archive.sha256"
committed=1

find "$backup_dir" -type f -name 'wingedhorse-*.sql.gz' -mtime "+$retention_days" -delete
find "$backup_dir" -type f -name 'wingedhorse-*.sql.gz.sha256' -mtime "+$retention_days" -delete

echo "Backup created and verified: $archive"
