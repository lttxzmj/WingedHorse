# WingedHorse

面向中国大陆用户的 Web/H5 数字生命陪伴与轻养成产品。项目已有可运行原型，当前进入单场景交互、生活事件引擎、小游戏和持久化重构阶段。

核心体验：娱乐问卷 → 获得个性化牛马 → 回到它持续变化的生活场景 → 观察、留言、陪伴和一起玩 → 形成共同记忆与关系变化。

## 文档

- [产品需求](docs/PRODUCT_REQUIREMENTS.md)
- [技术架构](docs/TECHNICAL_ARCHITECTURE.md)
- [UI 与角色风格规范](docs/UI_STYLE_GUIDE.md)
- [问卷计分审计](docs/QUESTIONNAIRE_AUDIT.md)
- [安全与合规](docs/SECURITY_COMPLIANCE.md)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)
- [多 Agent 协作任务包](docs/AI_WORKPACKS.md)
- [协作与代码规范](AGENTS.md)

## 当前状态

- 已完成 Monorepo、Web/API 原型、基础问卷、掉落游戏、Agent、端侧表情线索和部署脚手架。
- 已确认原创 2D 插画角色方向；现有图片只作情绪和题材参考，不作为最终美术源文件。
- 当前游戏和 Agent 仍属于原型，不按上线完成状态计算。
- 新版问卷材料整理期间，先升级题库和评分规则的版本化接口。
- 当前主线：废弃多入口门户，建立唯一数字生命生活场景和连续生活事件。

## 重要边界

- 产品对外统一称“娱乐测评”，不提供医疗诊断或心理诊断。
- 原始摄像头、视频和音频默认不上传；情绪与心率能力优先端侧推理、主动授权、可关闭。
- OpenRouter 密钥只允许存在于服务端。
- 任何参考品牌只能用于抽象风格研究，禁止复制角色、商标、轮廓和标志性视觉资产。
