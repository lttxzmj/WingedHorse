#!/usr/bin/env bash
set -euo pipefail

release_dir="${1:?release directory is required}"
env_file="${release_dir}/.env.production"
compose_file="${release_dir}/deploy/docker-compose.prod.yml"
previous_release="$(readlink -f /opt/wingedhorse/current 2>/dev/null || true)"
release_name="${release_dir##*/}"

embedded_hardware_profile() {
  local target_env="$1"
  [[ -f "$target_env" ]] &&
    grep -Eq '^HARDWARE_API_ENABLED=true$' "$target_env" &&
    grep -Eq '^MQTT_URL=mqtt://mosquitto(?::|/|$)' "$target_env"
}

rollback() {
  exit_code=$?
  trap - ERR
  if [[ -n "$previous_release" && -d "$previous_release/deploy" ]]; then
    echo "Candidate failed; restoring previous release ${previous_release##*/}"
    previous_name="${previous_release##*/}"
    if ! docker image inspect "wingedhorse-api:${previous_name}" "wingedhorse-web:${previous_name}" >/dev/null 2>&1; then
      echo "Previous release images are unavailable; refusing an on-server rollback rebuild." >&2
      exit "$exit_code"
    fi
    rollback_profile=()
    if embedded_hardware_profile "$previous_release/.env.production"; then
      rollback_profile=(--profile hardware)
    fi
    cd "$previous_release/deploy"
    WINGEDHORSE_IMAGE_TAG="$previous_name" docker compose \
      --env-file ../.env.production -f docker-compose.prod.yml \
      "${rollback_profile[@]}" up -d --no-build
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
    chmod 644 "$release_dir/deploy/mosquitto/passwd"
    cp "$release_dir/deploy/mosquitto/passwd" /opt/wingedhorse/manual/mosquitto/passwd
  fi
fi

available_kb="$(df -Pk "$release_dir" | awk 'NR==2 {print $4}')"
if [[ ! "$available_kb" =~ ^[0-9]+$ ]] || (( available_kb < 10 * 1024 * 1024 )); then
  echo "At least 10 GB of free disk is required before a production build." >&2
  exit 1
fi
memory_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
swap_kb="$(awk '/SwapFree:/ {print $2}' /proc/meminfo)"
if (( memory_kb + swap_kb < 3 * 1024 * 1024 )); then
  echo "At least 3 GB of available memory plus swap is required before a production build." >&2
  exit 1
fi

profile_args=()
if embedded_hardware_profile "$env_file"; then
  [[ -s "$release_dir/deploy/mosquitto/passwd" ]]
  profile_args=(--profile hardware)
fi

WINGEDHORSE_IMAGE_TAG="$release_name" docker compose \
  --env-file "$env_file" -f "$compose_file" config --quiet
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

docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" \
  -c "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT NOW())"
for migration in migrations/*.sql; do
  migration_name="${migration##*/}"
  [[ "$migration_name" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]
  applied="$(docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    psql -At -v ON_ERROR_STOP=1 \
    -U "$postgres_user" -d "$postgres_database" \
    -c "SELECT 1 FROM schema_migrations WHERE name = '$migration_name'")"
  if [[ "$applied" == "1" ]]; then
    echo "Skipping applied migration: $migration_name"
    continue
  fi
  docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" < "$migration"
  docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    psql -v ON_ERROR_STOP=1 \
    -U "$postgres_user" -d "$postgres_database" \
    -c "INSERT INTO schema_migrations(name) VALUES ('$migration_name')"
done

# 2C2G 宿主同时并行构建 web/api 两个镜像会触发 OOM，拖垮包括 sshd 在内的整机进程；
# 必须逐个串行构建，构建完成后再统一启动。
WINGEDHORSE_IMAGE_TAG="$release_name" docker compose \
  --env-file "$env_file" -f "$compose_file" build api
WINGEDHORSE_IMAGE_TAG="$release_name" docker compose \
  --env-file "$env_file" -f "$compose_file" build web
WINGEDHORSE_IMAGE_TAG="$release_name" docker compose \
  --env-file "$env_file" -f "$compose_file" "${profile_args[@]}" up -d --no-build
WINGEDHORSE_IMAGE_TAG="$release_name" docker compose \
  --env-file "$env_file" -f "$compose_file" "${profile_args[@]}" ps
curl --fail --retry 12 --retry-delay 5 http://127.0.0.1:8080/api/health
ln -sfn "$release_dir" /opt/wingedhorse/current.next
mv -Tf /opt/wingedhorse/current.next /opt/wingedhorse/current
trap - ERR
echo "Release promoted: ${release_dir##*/}"

# 根本治理：自动回收构建缓存、废弃镜像与历史版本，杜绝磁盘打满
echo "Running post-deploy disk hygiene..."
timeout 300 docker builder prune --all --keep-storage 1GB --force || true
timeout 120 docker image prune --force || true

# 保留最近 3 个发布版本目录，清理历史无用 SHA 文件夹
if [[ -d /opt/wingedhorse/releases ]]; then
  current_target="$(readlink -f /opt/wingedhorse/current 2>/dev/null || true)"
  # 按修改时间保留最近 3 个；SHA 目录名按字典序排会误删刚发布的上一版，破坏回滚
  find /opt/wingedhorse/releases -mindepth 1 -maxdepth 1 -type d -printf "%T@ %p\n" | sort -rn | cut -d" " -f2- | tail -n +4 | while read -r old_release; do
    if [[ "$old_release" != "$current_target" ]]; then
      echo "Pruning old release directory: $old_release"
      rm -rf "$old_release" || true
    fi
  done
fi
