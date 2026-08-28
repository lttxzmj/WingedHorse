#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-/opt/wingedhorse/current/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/wingedhorse/current/deploy/docker-compose.prod.yml}"
archive="${1:-}"

if [ -z "$archive" ] || [ ! -f "$archive" ]; then
  echo "Usage: $0 /path/to/wingedhorse-YYYYMMDD-HHMMSS.sql.gz" >&2
  exit 2
fi

env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }
POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
[ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] || {
  echo "POSTGRES_USER and POSTGRES_DB are required" >&2
  exit 2
}

target_database="${RESTORE_DATABASE:-${POSTGRES_DB}_restore_drill}"
case "$target_database" in
  *[!A-Za-z0-9_]*|'') echo "RESTORE_DATABASE contains unsafe characters" >&2; exit 2 ;;
esac
case "$target_database" in
  *_restore|*_restore_drill) ;;
  *) echo "RESTORE_DATABASE must end in _restore or _restore_drill" >&2; exit 2 ;;
esac
if [ "$target_database" = "$POSTGRES_DB" ]; then
  echo "Refusing to restore over the production database" >&2
  exit 2
fi

gzip -t "$archive"
if [ -f "$archive.sha256" ]; then
  expected="$(awk 'NR==1 {print $1}' "$archive.sha256")"
  actual="$(sha256sum "$archive" | awk '{print $1}')"
  [ "$expected" = "$actual" ] || { echo "Backup checksum mismatch" >&2; exit 1; }
fi

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$target_database' AND pid <> pg_backend_pid();" >/dev/null
compose exec -T postgres dropdb --if-exists -U "$POSTGRES_USER" "$target_database"
compose exec -T postgres createdb -U "$POSTGRES_USER" "$target_database"
gzip -dc "$archive" | compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$target_database" >/dev/null

required_tables="$(compose exec -T postgres psql -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$target_database" -c \
  "SELECT count(*) FROM pg_class WHERE relkind='r' AND relname IN ('life_events','digital_life_plans','player_states','game_sessions');")"
[ "$required_tables" = "4" ] || { echo "Restore validation failed: required tables missing" >&2; exit 1; }

echo "Restore drill passed in isolated database: $target_database"
