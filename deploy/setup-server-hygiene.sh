#!/usr/bin/env bash
# WingedHorse & Host 磁盘与 Docker 根本治理脚本
set -euo pipefail

echo "=== 1. 配置 Docker 全局日志轮转与限制（彻底防止容器日志打满磁盘） ==="
mkdir -p /etc/docker
daemon_json="/etc/docker/daemon.json"

if [[ ! -f "$daemon_json" ]]; then
  cat > "$daemon_json" << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "2GB"
    }
  }
}
EOF
else
  # 如果已存在 daemon.json，用 python/jq 注入安全限制
  python3 -c '
import json, os
path = "/etc/docker/daemon.json"
try:
    with open(path, "r") as f:
        data = json.load(f)
except Exception:
    data = {}
data.setdefault("log-driver", "json-file")
data.setdefault("log-opts", {})
data["log-opts"]["max-size"] = "20m"
data["log-opts"]["max-file"] = "3"
data.setdefault("builder", {}).setdefault("gc", {})
data["builder"]["gc"]["enabled"] = True
data["builder"]["gc"]["defaultKeepStorage"] = "2GB"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
'
fi

echo "=== 2. 配置 Systemd Journal 日志上限 ==="
if [[ -f /etc/systemd/journald.conf ]]; then
  sed -i 's/^#\?SystemMaxUse=.*/SystemMaxUse=300M/' /etc/systemd/journald.conf
  sed -i 's/^#\?SystemMaxFileSize=.*/SystemMaxFileSize=50M/' /etc/systemd/journald.conf
  systemctl restart systemd-journald || true
fi

echo "=== 3. 释放无用 Docker 历史构建层与悬空镜像 ==="
docker builder prune -af --filter "until=4h" || true
docker image prune -af --filter "until=24h" || true
docker container prune -f || true

echo "=== 4. 安装磁盘自动防护守护任务 (Cron Watchdog) ==="
mkdir -p /opt/wingedhorse/scripts
watchdog_script="/opt/wingedhorse/scripts/disk-watchdog.sh"

cat > "$watchdog_script" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
# 检查根目录使用率
usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$usage" -gt 75 ]; then
  echo "$(date): Disk usage at ${usage}%, triggering automated cleanup..." >> /var/log/wingedhorse-disk.log
  docker builder prune --keep-storage 1GB --force >> /var/log/wingedhorse-disk.log 2>&1 || true
  docker image prune --force >> /var/log/wingedhorse-disk.log 2>&1 || true
  journalctl --vacuum-size=200M >> /var/log/wingedhorse-disk.log 2>&1 || true
fi
EOF
chmod +x "$watchdog_script"

# 添加至 crontab（每 2 小时检查一次）
if ! crontab -l 2>/dev/null | grep -q "disk-watchdog.sh"; then
  (crontab -l 2>/dev/null || true; echo "0 */2 * * * /opt/wingedhorse/scripts/disk-watchdog.sh >/dev/null 2>&1") | crontab -
fi

echo "=== 5. 治理完成，当前磁盘状态： ==="
df -h /
