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
systemctl enable --now docker
systemctl reload docker || systemctl restart docker

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
exec 9>/run/lock/wingedhorse-disk-watchdog.lock
flock -n 9 || exit 0
# 检查根目录使用率
usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$usage" -gt 75 ]; then
  echo "$(date): Disk usage at ${usage}%, triggering automated cleanup..." >> /var/log/wingedhorse-disk.log
  timeout 300 docker builder prune --all --keep-storage 1GB --force >> /var/log/wingedhorse-disk.log 2>&1 || true
  timeout 120 docker image prune --force >> /var/log/wingedhorse-disk.log 2>&1 || true
  timeout 60 journalctl --vacuum-size=200M >> /var/log/wingedhorse-disk.log 2>&1 || true
  remaining=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$remaining" -gt 85 ]; then
    echo "$(date): CRITICAL disk usage remains at ${remaining}%; manual intervention required." >> /var/log/wingedhorse-disk.log
  fi
fi
EOF
chmod +x "$watchdog_script"

# 添加至 crontab（每小时检查一次），并替换旧计划避免重复任务
(crontab -l 2>/dev/null | grep -v "disk-watchdog.sh" || true; echo "17 * * * * /opt/wingedhorse/scripts/disk-watchdog.sh >/dev/null 2>&1") | crontab -

echo "=== 5. 配置交换空间（防止构建期 OOM 拖垮 sshd 与全部容器） ==="
if ! swapon --show | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  if ! grep -q '^/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi
# 低 swappiness：平时不主动换页，只在内存真正紧张时兼作缓冲
sysctl -w vm.swappiness=10 || true
if ! grep -q '^vm.swappiness' /etc/sysctl.conf 2>/dev/null; then
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
swapon --show || true

echo "=== 6. 治理完成，当前磁盘状态： ==="
df -h /
