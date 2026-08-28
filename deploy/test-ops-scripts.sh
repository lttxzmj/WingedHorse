#!/bin/sh
set -eu

repo_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT HUP INT TERM
mkdir -p "$test_dir/bin" "$test_dir/backups"

cat > "$test_dir/env" <<'EOF'
POSTGRES_USER=wingedhorse
POSTGRES_PASSWORD=test-only
POSTGRES_DB=wingedhorse
EOF

cat > "$test_dir/bin/docker" <<'EOF'
#!/bin/sh
if [ "${FAIL_DUMP:-0}" = "1" ] && printf '%s' "$*" | grep -q ' pg_dump '; then
  printf '%s\n' 'simulated dump failure' >&2
  exit 1
fi
case "$*" in
  *" pg_dump "*) printf '%s\n' 'CREATE TABLE life_events(id text);' ;;
  *"SELECT count(*) FROM pg_class"*) printf '%s\n' '4' ;;
  *" psql "*) cat >/dev/null || true ;;
  *) : ;;
esac
EOF
chmod +x "$test_dir/bin/docker"

PATH="$test_dir/bin:$PATH" ENV_FILE="$test_dir/env" COMPOSE_FILE="$repo_dir/deploy/docker-compose.prod.yml" \
  BACKUP_DIR="$test_dir/backups" RETENTION_DAYS=7 "$repo_dir/deploy/backup-postgres.sh"
archive="$(find "$test_dir/backups" -name 'wingedhorse-*.sql.gz' -type f | head -n 1)"
test -n "$archive"
test -s "$archive"
gzip -t "$archive"
test -s "$archive.sha256"

mkdir -p "$test_dir/failed-backups"
if PATH="$test_dir/bin:$PATH" FAIL_DUMP=1 ENV_FILE="$test_dir/env" \
  COMPOSE_FILE="$repo_dir/deploy/docker-compose.prod.yml" BACKUP_DIR="$test_dir/failed-backups" \
  "$repo_dir/deploy/backup-postgres.sh" >/dev/null 2>&1; then
  echo "backup script accepted a failed dump" >&2
  exit 1
fi
test -z "$(find "$test_dir/failed-backups" -name 'wingedhorse-*.sql.gz' -type f -print -quit)"

PATH="$test_dir/bin:$PATH" ENV_FILE="$test_dir/env" COMPOSE_FILE="$repo_dir/deploy/docker-compose.prod.yml" \
  RESTORE_DATABASE=wingedhorse_restore_drill "$repo_dir/deploy/restore-postgres-drill.sh" "$archive"

if PATH="$test_dir/bin:$PATH" ENV_FILE="$test_dir/env" COMPOSE_FILE="$repo_dir/deploy/docker-compose.prod.yml" \
  RESTORE_DATABASE=wingedhorse "$repo_dir/deploy/restore-postgres-drill.sh" "$archive" >/dev/null 2>&1; then
  echo "restore script accepted the production database" >&2
  exit 1
fi

cp "$archive" "$test_dir/corrupt.sql.gz"
cp "$archive.sha256" "$test_dir/corrupt.sql.gz.sha256"
printf 'x' >> "$test_dir/corrupt.sql.gz"
if PATH="$test_dir/bin:$PATH" ENV_FILE="$test_dir/env" COMPOSE_FILE="$repo_dir/deploy/docker-compose.prod.yml" \
  RESTORE_DATABASE=wingedhorse_restore_drill "$repo_dir/deploy/restore-postgres-drill.sh" \
  "$test_dir/corrupt.sql.gz" >/dev/null 2>&1; then
  echo "restore script accepted a corrupted archive" >&2
  exit 1
fi

echo "Operations scripts passed"
