#!/usr/bin/env bash
set -euo pipefail

release_dir="${1:?release directory is required}"
env_file="${release_dir}/.env.production"
compose_file="${release_dir}/deploy/docker-compose.prod.yml"
previous_release="$(readlink -f /opt/wingedhorse/current 2>/dev/null || true)"

rollback() {
  exit_code=$?
  trap - ERR
  if [[ -n "$previous_release" && -d "$previous_release/deploy" ]]; then
    echo "Candidate failed; restoring previous release ${previous_release##*/}"
    cd "$previous_release/deploy"
    docker compose --env-file ../.env.production -f docker-compose.prod.yml up -d --build
    curl --fail --retry 12 --retry-delay 5 http://127.0.0.1:8080/api/health
  fi
  exit "$exit_code"
}
trap rollback ERR

cd "$release_dir/deploy"
docker compose --env-file "$env_file" -f "$compose_file" config --quiet
docker compose --env-file "$env_file" -f "$compose_file" up -d postgres redis
postgres_user="$(grep '^POSTGRES_USER=' "$env_file" | cut -d= -f2-)"
postgres_database="$(grep '^POSTGRES_DB=' "$env_file" | cut -d= -f2-)"
[[ -n "$postgres_user" && -n "$postgres_database" ]]
postgres_ready=0
for _attempt in {1..30}; do
  if docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    pg_isready -U "$postgres_user" -d "$postgres_database"; then
    postgres_ready=1
    break
  fi
  sleep 2
done
[[ "$postgres_ready" -eq 1 ]]

ENV_FILE="$env_file" COMPOSE_FILE="$compose_file" \
  BACKUP_DIR=/opt/wingedhorse/backups/postgres \
  "$release_dir/deploy/backup-postgres.sh"

for migration in migrations/*.sql; do
  docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" < "$migration"
done

docker compose --env-file "$env_file" -f "$compose_file" up -d --build
docker compose --env-file "$env_file" -f "$compose_file" ps
curl --fail --retry 12 --retry-delay 5 http://127.0.0.1:8080/api/health
ln -sfn "$release_dir" /opt/wingedhorse/current.next
mv -Tf /opt/wingedhorse/current.next /opt/wingedhorse/current
trap - ERR
echo "Release promoted: ${release_dir##*/}"
