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
    docker compose --env-file ../.env.production -f docker-compose.prod.yml build api
    docker compose --env-file ../.env.production -f docker-compose.prod.yml build web
    docker compose --env-file ../.env.production -f docker-compose.prod.yml up -d
    curl --fail --retry 12 --retry-delay 5 http://127.0.0.1:8080/api/health
  fi
  exit "$exit_code"
}
trap rollback ERR

cd "$release_dir/deploy"
if [[ -f /opt/wingedhorse/manual/mosquitto/passwd ]]; then
  cp /opt/wingedhorse/manual/mosquitto/passwd "$release_dir/deploy/mosquitto/passwd"
elif [[ ! -f "$release_dir/deploy/mosquitto/passwd" ]]; then
  mqtt_user="$(grep '^MQTT_USER=' "$env_file" | cut -d= -f2- || true)"
  mqtt_pass="$(grep '^MQTT_PASSWORD=' "$env_file" | cut -d= -f2- || true)"
  if [[ -n "$mqtt_user" && -n "$mqtt_pass" ]]; then
    mkdir -p "$release_dir/deploy/mosquitto" /opt/wingedhorse/manual/mosquitto
    docker run --rm -v "$release_dir/deploy/mosquitto:/tmp/mosq" eclipse-mosquitto:2 \
      mosquitto_passwd -b -c /tmp/mosq/passwd "$mqtt_user" "$mqtt_pass"
    docker run --rm -v "$release_dir/deploy/mosquitto:/tmp/mosq" eclipse-mosquitto:2 \
      mosquitto_passwd -b /tmp/mosq/passwd "lamp-001" "wingedhorse-lamp-001"
    chmod 644 "$release_dir/deploy/mosquitto/passwd"
    cp "$release_dir/deploy/mosquitto/passwd" /opt/wingedhorse/manual/mosquitto/passwd
  fi
fi

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

# 2C2G 宿主同时并行构建 web/api 两个镜像会触发 OOM，拖垮包括 sshd 在内的整机进程；
# 必须逐个串行构建，构建完成后再统一启动。
docker compose --env-file "$env_file" -f "$compose_file" build api
docker compose --env-file "$env_file" -f "$compose_file" build web
docker compose --env-file "$env_file" -f "$compose_file" --profile hardware up -d
docker compose --env-file "$env_file" -f "$compose_file" --profile hardware ps
curl --fail --retry 12 --retry-delay 5 http://127.0.0.1:8080/api/health
ln -sfn "$release_dir" /opt/wingedhorse/current.next
mv -Tf /opt/wingedhorse/current.next /opt/wingedhorse/current
trap - ERR
echo "Release promoted: ${release_dir##*/}"

# 根本治理：自动回收构建缓存、废弃镜像与历史版本，杜绝磁盘打满
echo "Running post-deploy disk hygiene..."
docker builder prune --keep-storage 1GB --force || true
docker image prune --force || true

# 保留最近 3 个发布版本目录，清理历史无用 SHA 文件夹
if [[ -d /opt/wingedhorse/releases ]]; then
  current_target="$(readlink -f /opt/wingedhorse/current 2>/dev/null || true)"
  find /opt/wingedhorse/releases -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +4 | while read -r old_release; do
    if [[ "$old_release" != "$current_target" ]]; then
      echo "Pruning old release directory: $old_release"
      rm -rf "$old_release" || true
    fi
  done
fi
