# WingedHorse 技术架构

状态：Implemented baseline v0.2
原则：Web/H5 优先、领域规则可测试、敏感数据最少化、部署方式可替换

## 1. 技术目标

- 支持手机浏览器流畅完成问卷、角色互动和 30–60 秒小游戏。
- 问卷与游戏规则独立于 UI，能够用纯 TypeScript 测试。
- OpenRouter、数据库、部署厂商和模型都通过适配层隔离。
- 敏感媒体优先端侧处理，服务端默认看不到原始视频和音频。
- Demo 可以低成本运行，后续可迁移到中国大陆 VPS 的 Docker Compose 部署。

## 2. 推荐技术栈

### 前端

- React + TypeScript + Vite：Web/H5 主应用。
- TanStack Router：类型安全路由与懒加载。
- TanStack Query：服务端状态、缓存与请求恢复。
- Zustand：少量跨页面客户端状态；领域数据不与视图状态混用。
- Zod：运行时数据校验，与 API 合约共享。
- CSS Variables + CSS Modules：设计令牌和组件样式；不让第三方组件库决定视觉风格。
- PWA：离线壳、安装入口和资源缓存，第二阶段启用。

### 游戏与角色

- Phaser：掉落、碰撞、回合和输入循环；仅在小游戏路由懒加载。
- Rive：主页角色、表情和状态机；原画未分层前使用轻量 SVG/PNG 占位。
- 同一角色资产提供两种交付：Rive 交互文件用于主页，纹理图集用于 Phaser 场景。
- 尊重 prefers-reduced-motion，低性能设备降级到静态帧。

### 后端

- NestJS + Fastify Adapter：模块化 API、鉴权、任务和安全策略。
- PostgreSQL：用户、问卷、背包、养成、同意记录和审计数据。
- pgvector：只有在真实检索需求出现时启用，不提前把所有对话向量化。
- Redis + BullMQ：延迟任务、限流和异步摘要；MVP 无需要时保持可选。
- OpenAPI：API 契约和客户端生成。

### AI

- OpenRouter 通过服务端 Provider Adapter 接入。
- Model Policy 根据任务选择模型：日常对话、结构化摘要、视觉理解、高风险分类分开配置。
  - 服务端环境变量：`OPENROUTER_CHAT_MODEL`（对话，`deepseek/deepseek-chat`）、`OPENROUTER_SUMMARY_MODEL`（摘要，回退 chat）、`OPENROUTER_VISION_MODEL`（视觉，`qwen/qwen3-vl-30b-a3b-thinking`）。
  - 高风险分类不走模型，由本地规则化流程（SafetyService）处理，fail-safe、零成本零延迟。
- 模型 ID、超时、预算、隐私路由和降级策略只存在服务端配置。
- 所有模型输出先经过结构校验、安全后处理和产品文案边界。

### 端侧感知

- MediaPipe 或等价浏览器端模型用于面部关键点/表情线索。
- rPPG 只做实验性趣味功能，单独 feature flag 控制。
- 原始帧不写入 IndexedDB、日志、埋点和错误上报。

## 3. Monorepo 结构

计划结构：

    apps/
      web/                 React Web/H5
      api/                 NestJS API
    packages/
      domain/              问卷、类型、物品、掉落、数值规则
      contracts/           Zod schema 与 API DTO
      ui/                  令牌、基础组件、图标和视觉测试
      character-runtime/   Rive/静态角色适配层
      config/              TypeScript、ESLint、测试共享配置
    assets/
      source/              获得授权的可编辑源文件
      runtime/             经优化的运行时文件
    docs/
    deploy/

包管理器使用 pnpm workspace。构建缓存工具在仓库规模需要时再引入。

## 4. 领域边界

### assessment

- QuestionSet 有明确 version。
- ScoringEngine 输入为题目版本和答案，输出原始分、标准分、类型和解释标签。
- 计分必须是纯函数，不读取时间、网络或数据库。
- 理论区间与题目定义自动计算，禁止人工重复维护魔法数字。

### pet

- 测评基线与日常养成值分开保存。
- 类型只由主动复测更新。
- 物品和任务只改变养成值及视觉状态。

### inventory

- ItemDefinition 是版本化配置。
- InventoryTransaction 记录获得、使用、过期和补偿。
- 服务端事务是最终事实，客户端先行动画可回滚。

### game

- DropTable 由可测试配置生成。
- GameSession 使用随机种子，便于复现异常和验证概率。
- 帧循环只管理表现和碰撞，奖励由结算规则生成。

### companion

- Conversation Orchestrator 负责模型调用、预算、上下文、安全和降级。
- Memory Service 只保存用户可解释、可管理的记忆。
- Crisis Flow 与普通对话流分离。

### digital-life

- Digital Life Engine 是独立于 OpenRouter 的领域层，维护角色计划、世界上下文、关系状态和生活事件。
- Planning 根据角色动机、时间、世界输入、物品和历史事件产生结构化计划；Simulation 负责状态转换；Rendering 才调用模型生成文案或媒体方案。
- LifeEvent 是事实源，LifePost 是对事实的呈现；模型不得直接写 PetState、Inventory 或 RelationshipState。
- 所有自动事件使用稳定幂等键、时区和可追溯触发来源，避免刷新、重试或多实例重复生成。
- MVP 可由 API 定时任务惰性推进：用户访问时补算应发生事件；规模扩大后再迁移至 BullMQ worker。
- v0.1 已实现确定性 Planner、惰性 Simulation、PostgreSQL Event/Plan Repository、匿名能力凭证和完整删除边界，详见 `docs/DIGITAL_LIFE_ENGINE.md`。
- 跨日故事和 AI 牛马访客由纯领域规则稳定生成，不调用模型、不依赖定时任务，也不读取其他用户状态。
- `PlayerRepository` 以 PostgreSQL 行锁执行一次性游戏结算和物品消耗；`game_sessions` 防止重试重复发奖，`player_states.revision` 标记养成事务版本。
- 云端背包与生活簿是两个独立授权目的。浏览器在用户明确授权前不得调用 `/game/sessions` 或 `/player/items/consume`。

## 5. API 边界

首批接口：

- GET /question-sets/current
- POST /assessments
- GET /assessments/:id/result
- GET /pet
- POST /game/sessions
- POST /game/sessions/:id/settle
- GET /player/state
- POST /player/items/consume
- POST /game-sessions/:id/settle
- GET /inventory
- POST /inventory/:itemId/use
- POST /companion/messages
- GET /memories
- PATCH /memories/:id
- DELETE /memories/:id
- POST /consents
- DELETE /account/data
- GET /life/current
- GET /life/events?cursor=
- POST /life/events/:id/interactions
- POST /life/notes

所有写接口：

- 校验 schema。
- 使用幂等键处理重复提交。
- 返回稳定错误码，不向客户端暴露内部栈。
- 记录必要审计信息，但不记录敏感正文和媒体。

生活流接口额外要求：

- 游标分页使用稳定事件时间与 ID，不使用客户端本地数组作为最终事实。
- 互动写入必须检查事件归属、状态和幂等键。
- 面向用户的动态文本可重新渲染，但底层 LifeEvent 事实不可被模型响应覆盖。

## 6. 问卷实现决策

- 题库以 TypeScript/JSON 数据文件保存，构建时校验唯一 ID、选项数量、维度名和分值。
- 每个版本生成可达最小值/最大值，测试结果必须与审计文档一致。
- 百分制公式：

  normalized = (raw - reachableMin) / (reachableMax - reachableMin) * 100

- 输出限制在 0–100，并保留足够精度；UI 再负责取整。
- 初期使用 50 分阈值分型，收集足够样本后才可通过版本化迁移改为常模阈值。

## 7. 游戏实现

- Phaser 场景与 React 页面通过窄事件接口通信。
- React 负责用户、背包和弹窗；Phaser 负责帧循环、输入、掉落和碰撞表现。
- 每局开始时服务端或本地规则产生 seed 与 DropTable 版本。
- 每局结束提交事件摘要，不提交每一帧轨迹。
- 首屏不加载 Phaser 和大型角色资源；进入小游戏再预加载。

性能预算：

- 主应用首个可交互目标：中端手机良好网络下小于 3 秒。
- 小游戏稳定目标：主流设备 60 FPS，可接受降级底线 30 FPS。
- 首屏关键 JS gzip 建议小于 200 KB，不含延迟加载游戏和 Rive runtime。
- 图片提供明确尺寸和现代格式，角色静态回退资源单张建议小于 200 KB。

## 8. Rive 角色契约

- 一个共享骨骼/状态机规范服务 8 种皮肤，除非角色体型差异经评审确认无法共用。
- 状态建议：idle、blink、listen、talk、happy、proud、tired、comfort、sleep、surprised、catch、miss。
- 数据绑定建议：energy、engine、chaos、direction、isResting、isTalking、reaction。
- React 不依赖 Rive 内部节点名，只依赖公开的数据绑定契约。
- .riv 文件按二进制提交，避免行尾转换损坏。

Rive 官方文档建议使用状态机和数据绑定控制运行时动画，并说明 Web/React runtime 通过 npm 发布：

- https://rive.app/docs/runtimes/getting-started
- https://rive.app/docs/runtimes/web/state-machines

## 9. 数据与存储

- 账号与匿名游客都使用不可预测 ID。
- 问卷答案与结果分开建模，支持删除答案但保留匿名统计。
- 原始音视频默认不进入服务端存储。
- 长期记忆必须有来源、创建原因、可见性和删除状态。
- 本机数据导出由前端纯函数按版本化白名单生成 JSON；不得直接序列化 Zustand 持久化对象，避免暴露匿名能力凭证、幂等会话 ID 和内部修订字段。
- 数据库迁移必须可回滚；生产环境不允许 ORM 自动改表。

## 10. 安全设计

- API 在创建 Nest 应用前使用 Zod 校验端口、生产数据库、OpenRouter、MQTT 和公网 URL；错误只列字段名，不回显值。生产数据库缺失、半配置凭据和模板占位 Secret 均直接拒绝启动。
- OpenRouter Key、数据库密码和签名密钥只存在服务端 Secret。
- CSP 限制脚本、媒体、连接和 iframe 来源。
- Cookie 使用 Secure、HttpOnly、SameSite；需要时启用 CSRF 防护。
- 对登录、消息、上传和删除接口限流。
- 错误上报先做字段白名单和内容脱敏。
- 依赖锁文件进入版本库，CI 执行漏洞扫描和许可证检查。
- AI Prompt 中不拼接不必要的身份信息或原始健康数据。

完整要求见 docs/SECURITY_COMPLIANCE.md。

## 11. 测试策略

- Domain：Vitest 单元测试，重点覆盖计分、掉落、背包和状态机。
- UI：组件交互测试、可访问性检查、视觉回归。
- API：模块集成测试与数据库事务测试。
- E2E：Playwright 在桌面与 390 px H5 覆盖问卷 → 结果 → 草原，并真实运行完整 30 秒小游戏，验证接住 → 幂等结算 → 入包 → 消耗 → 数值与生活事件；另覆盖未完成退出、加载失败、暂停和无 `randomUUID` 的 HTTP 环境。
- AI：固定安全评测集，不用模型随机回答作为普通单元测试断言。
- 性能：移动端 Lighthouse 与小游戏 FPS 采样。

合并门禁：

- typecheck、lint、unit、关键 E2E、构建全部通过。
- 无密钥、原始敏感媒体和未授权素材进入 Git。

## 12. 部署

### 开发与预览

- 本地 Docker Compose 提供 PostgreSQL/Redis。
- Web 和 API 可独立启动；无 API 时支持明确标识的 mock 模式。
- 预览环境使用独立数据库、独立 OpenRouter Key 和严格预算。

### 正式环境

- 延续 VibeShot 风格：GitHub Actions 构建镜像，Docker Compose 部署到中国大陆 Linux VPS。
- Nginx/兼容网关负责 TLS、静态资源、API 反向代理和限流。
- 数据库不暴露公网端口。
- 发布采用健康检查和可回滚镜像标签。
- 域名、备案和部署服务商在上线前单独决策，不把厂商 SDK 写入领域层。

## 13. 架构决策待办

- 身份体系与游客数据合并策略。
- 免费预览环境的具体服务商。
- PostgreSQL 是否首阶段托管或与 API 同机。
- Agent 上线阶段与模型预算。
- Rive 资产生产能力是否具备；不具备时先采用 SVG/CSS 动效。

## 14. 设备联动与硬件（心情灯）

### 组件

- ESP32（枢纽）：WiFi + MQTT，读传感器、控灯。
- WS2812B LED 灯带（主心情灯）、RGB 三色 LED（状态点）。
- 输入：MAX30102 心率、FSR 压力、DHT22 温湿度。

### 通信

```
浏览器/服务端 → MQTT broker(Mosquitto, 与 API 同 VPS) → ESP32
  下行 topic: devices/{deviceId}/effect
  上行 topic: devices/{deviceId}/telemetry
```

- broker 鉴权 + ACL 按用户隔离：服务端用户可 `write devices/#`；设备用户只 `read devices/{id}/effect`、`write devices/{id}/telemetry`（防越权）。
- 服务端 `MqttProvider` 适配器，未配置 `MQTT_URL` 时优雅降级为 no-op。

### 心情 → 灯效（领域纯函数，packages/domain/src/signals/lighting.ts）

| 心情    | 颜色      | 亮度 | 动画    |
| ------- | --------- | ---- | ------- |
| good    | `#FFD057` | 90   | breathe |
| flat    | `#FFF3D6` | 45   | steady  |
| tired   | `#FFB25A` | 55   | breathe |
| anxious | `#4D8FCB` | 55   | flow    |
| sad     | `#FF9E7A` | 50   | breathe |
| 休养    | `#FFF6E8` | 20   | breathe |

### 端侧表情线索（MediaPipe）

- `@mediapipe/tasks-vision` Face Landmarker，WASM + 模型自托管于 `apps/web/public/`，懒加载。
- 关键点 → 几何规则打标签（微笑/皱眉/惊讶/疲惫/平静），纯函数 `classifyExpression`。
- 构建期开关 `VITE_FEATURE_CAMERA_SIGNALS`，生产默认关闭；开发环境可验证拒绝权限与释放流程。
- rPPG 使用独立的 `VITE_FEATURE_RPPG`，即使镜头/表情实验开启也不会隐式启用趣味脉搏趋势。
- 停止与卸载会递增运行代次，迟到的 MediaPipe Promise 不得回写界面；同时停止轨道并清空视频源、采样和画布。

### 固件与资产

- `hardware/esp32/wingedhorse_lamp/`：Arduino 固件（PubSubClient + FastLED + ArduinoJson + DHT + MAX3010x）。
- 心率只上传派生标签（calm/active/elevated），不上传原始数值。
