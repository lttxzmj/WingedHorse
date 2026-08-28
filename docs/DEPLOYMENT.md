# WingedHorse 大陆 VPS 部署手册

状态：已部署上线（与 VibeShot 共存于同一台 CVM，HTTP 过渡态，未绑域名/HTTPS）。

## 0. 当前实际部署（2026-08-27）

| 项               | 值                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 服务器           | 腾讯云 CVM `43.140.245.191`（2C2G TencentOS，Docker 26 + Compose v2）                                                                                                       |
| 访问地址（过渡） | `http://43.140.245.191:8080/`                                                                                                                                               |
| 目标域名         | `wingedhorse.leisuremaking.cn`（待 DNS + 证书 + 备案确认）                                                                                                                  |
| 端口             | web/nginx 绑定宿主 `8080`(HTTP) / `8443`(HTTPS)；`api:3100`、`postgres:5432` 仅内网；`mosquitto:1883` 对公网（设备直连，鉴权 + ACL）                                        |
| 目录             | `/opt/wingedhorse/releases/<SHA>/`（候选版本）、`/opt/wingedhorse/current`（当前版本软链）、`/opt/wingedhorse/manual/`（golden copy）、`/opt/wingedhorse/backups/postgres/` |
| 容器             | `wingedhorse-web-1`（nginx+静态）、`wingedhorse-api-1`（NestJS）、`wingedhorse-postgres-1`、`wingedhorse-mosquitto-1`（MQTT broker）                                        |
| 备份             | 每日 03:00 crontab → `backup-postgres.sh`，保留 7 天                                                                                                                        |
| OpenRouter       | 未配置，Agent 走 `local-fallback`                                                                                                                                           |

共存说明：宿主 `80/443` 已被 VibeShot 的 `vibeshot-nginx` 占用，因此 WingedHorse 的 nginx 改为 `8080/8443`。上域名后按「域名与 TLS」章节接入 443（经 VibeShot nginx 分流或独立监听）。

### 设备联动（MQTT）

- broker：`eclipse-mosquitto:2`，属于可选 `hardware` Compose profile，默认 Web/API 发布不会启动或暴露 1883。确认需要设备联动后，以 `--profile hardware` 启动；配置文件在 `deploy/mosquitto/`（`mosquitto.conf` + `aclfile`，可提交；`passwd` 在服务器生成，不入库）。
- 服务端用户 `wingedhorse`（API 连接用，凭据在 `.env.production` 的 `MQTT_URL/MQTT_USER/MQTT_PASSWORD`）；设备用户按 `lamp-001` 模式逐台建（凭据烧录进 ESP32）。
- 下行 `devices/{id}/effect`，上行 `devices/{id}/telemetry`，ACL 按用户隔离防越权。
- 固件：`hardware/esp32/wingedhorse_lamp/`（接线见 `hardware/esp32/README.md`）。

## 1. 服务器与域名

- 中国大陆公网服务在上线前完成域名备案、公安备案及 AI/算法相关适用性判断。
- 安装 Docker Engine 与 Compose v2；大陆网络按实际云厂商配置可信镜像源。

目录约定：

    /opt/wingedhorse/manual/.env.production
    /opt/wingedhorse/manual/cert/https/fullchain.pem
    /opt/wingedhorse/manual/cert/https/privkey.pem
    /opt/wingedhorse/incoming/
    /opt/wingedhorse/releases/
    /opt/wingedhorse/current -> /opt/wingedhorse/releases/<SHA>
    /opt/wingedhorse/backups/postgres/

## 2. 生产环境变量

复制 `deploy/.env.production.example` 到服务器的 `manual/.env.production`，至少替换：

- `POSTGRES_USER` / `POSTGRES_PASSWORD`：生产数据库账号；密码随机生成。
- `OPENROUTER_API_KEY`：仅服务端可见（也可放 GitHub Secrets，由 CI 注入）。
- 模型（Model Policy，非秘密，服务端 `.env.production` 直接配置）：`OPENROUTER_CHAT_MODEL` / `OPENROUTER_SUMMARY_MODEL` / `OPENROUTER_VISION_MODEL`。
- `PUBLIC_APP_URL`：备案域名的 HTTPS 地址。

不得把 `.env.production`、证书私钥或 SSH 私钥提交到 Git。

API 会在监听端口前验证生产环境：`DATABASE_URL` 必须存在，OpenRouter Key 与聊天模型必须成对配置，MQTT 用户名/密码必须成对配置，模板中的“请替换/change-me”占位 Secret 会导致启动失败。错误只报告字段名，不输出 Secret 值。

Agent 的四个应用层保护变量必须使用正整数：`COMPANION_IP_RATE_LIMIT_PER_MINUTE`（默认 60）、`COMPANION_SESSION_RATE_LIMIT_PER_MINUTE`（默认 20）、`COMPANION_SESSION_MODEL_BUDGET_PER_DAY`（默认 40）、`COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY`（默认 1000）。生产 Compose 使用带 AOF 的 Redis 原子统计分钟窗口、同会话并发锁和 UTC 自然日预算；`REDIS_PASSWORD` 必须为随机长密码，`COMPANION_FINGERPRINT_SECRET` 至少 32 字符并在全部 API 实例保持一致。Redis 不可用时远端模型调用会关闭，但经过审核的危机流程仍可用。仍须在 OpenRouter 账号侧另设费用上限，应用计数不是账单级硬上限。

注意：Compose 文件内的 `${POSTGRES_USER}` 等变量插值依赖 `--env-file ../.env.production`，而不是容器内的 `env_file` 注入；两者分工不同，部署命令必须同时带 `--env-file`。

## 3. 首次部署

1. 把经过审阅的 Git SHA 归档解压到 `/opt/wingedhorse/releases/<SHA>`，不要上传整个工作目录或 `.git`。
2. 从 `manual` 以 600 权限复制环境变量，并恢复证书。
3. 在候选版本的 `deploy` 目录运行 `docker compose --env-file ../.env.production -f docker-compose.prod.yml config --quiet`。
4. 审阅展开后的端口、卷和环境变量来源。
5. 运行 `docker compose --env-file ../.env.production -f docker-compose.prod.yml up -d --build`。
6. 检查 `docker compose --env-file ../.env.production -f docker-compose.prod.yml ps` 与 `https://域名/api/health`，健康后再原子更新 `current` 软链。

生产 Compose 不公开 PostgreSQL 端口；Web、API 以只读根文件系统、最小 capability、资源限制和日志轮转运行。

镜像说明：`deploy/Dockerfile.api` 使用 `pnpm deploy --prod --legacy` 生成自包含生产依赖，并把两个 workspace 包（domain/contracts）以构建产物目录回填，规避 pnpm 11 `deploy` 命令对 `inject-workspace-packages` 的强制要求。构建步骤已在本地以 `node apps/api/dist/main.js`（`NODE_ENV=production`）验证可启动。

## 4. GitHub 手动部署

仓库需要配置以下 Secrets（Settings → Secrets and variables → Actions → 选择 `production` 环境，deploy.yml 通过 `environment: production` 读取）：

- `VPS_HOST`：`43.140.245.191`
- `VPS_USER`：`root`
- `VPS_SSH_KEY`：`~/.ssh/id_ed25519` 的私钥内容（其公钥已在服务器 `authorized_keys`）

OpenRouter 密钥和模型策略只在服务器 600 权限的 `manual/.env.production` 中维护，不经过 GitHub Action 环境变量、`sed` 命令或构建参数。模型配置如下：

| 任务       | 变量                                    | 值                               |
| ---------- | --------------------------------------- | -------------------------------- |
| 日常对话   | `OPENROUTER_CHAT_MODEL`                 | `deepseek/deepseek-chat`         |
| 结构化摘要 | `OPENROUTER_SUMMARY_MODEL`              | `deepseek/deepseek-chat`         |
| 视觉理解   | `OPENROUTER_VISION_MODEL`               | `qwen/qwen3-vl-30b-a3b-thinking` |
| 高风险分类 | —（本地规则 `SafetyService`，不调模型） | —                                |

`.github/workflows/deploy.yml` 只有 `workflow_dispatch`，不会因推送代码自动改动生产。工作流使用 `git archive` 只上传受版本控制的文件，解压到 SHA 版本目录；OpenRouter 密钥只从服务器 golden copy 复制到候选版本，不落日志、不进镜像。首次人工部署、备份恢复演练和域名确认完成后，再单独评审是否开放自动部署。

Agent 流式路由由 nginx 单独配置：关闭 `proxy_buffering` 与缓存，读取超时为 25 秒。若上层 CDN 或宿主反向代理仍启用响应缓冲，浏览器会等到整段完成才显示；部署验收需用 `/api/companion/messages/stream` 确认 `application/x-ndjson`、`X-Accel-Buffering: no` 和分段到达。

Web 生产构建会生成 `asset-manifest.json`，Service Worker 按内容版本预缓存首页和页面分片，API 不进入 Cache Storage，Phaser 等超过 500 KB 的大型运行时只在首次使用后缓存。CI 在构建后执行 `pnpm test:e2e:production-sw`，用 Pixel 7 与桌面 Chromium 断网刷新 `/assessment`；发布前不得跳过该项。

## 5. 备份与恢复

- 把 `deploy/backup-postgres.sh` 安装为服务器定时任务，每日执行并将副本同步到不同故障域。
- 默认保留 7 天；上线前按业务与隐私保留策略调整。
- 每月至少做一次隔离环境恢复演练。恢复示例：

      gunzip -c wingedhorse-YYYYMMDD-HHMMSS.sql.gz | \
        docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

## 6. 发布与回滚门禁

- CI 的格式、lint、类型、单测、E2E、构建全部通过。
- 无密钥、原始音视频、未知授权素材进入镜像。
- 数据库变更先备份并提供向下迁移；当前版本尚未启用生产数据库写入，启用前需要迁移评审。
- 部署前记录上一版本 Git SHA。回滚时重新部署上一 SHA，不删除数据库卷。
- 不在自动脚本中执行 `docker compose down -v`、删除卷或清理全部镜像。

## 7. 域名与 TLS（待办）

当前 `deploy/nginx.conf` 为 HTTP-only 过渡配置。绑定 `wingedhorse.leisuremaking.cn` 的步骤如下：

1. 域名解析：`wingedhorse.leisuremaking.cn` A 记录 → `43.140.245.191`，并确认 ICP 备案覆盖。
2. 证书：腾讯云免费证书（或 certbot）签发该子域名证书，放 `/opt/wingedhorse/manual/cert/https/`（`fullchain.pem` + `privkey.pem`），发布时复制到候选版本。
3. nginx：在 `deploy/nginx.conf` 增加 `listen 8443 ssl` 的 server 块（含 HSTS），并把 `listen 8080` 块改回 `301 https://` 跳转；`docker compose restart web`。
4. 443 分流（二选一）：
   - 让 VibeShot 的 `vibeshot-nginx`（持有 80/443）新增 `server_name wingedhorse.leisuremaking.cn`，反向代理到 `http://127.0.0.1:8080`；
   - 或给 WingedHorse 独立公网入口（新 IP / 独立 nginx 监听 443）。
5. 验证：`curl -I https://wingedhorse.leisuremaking.cn/` 与 `/api/health`。
