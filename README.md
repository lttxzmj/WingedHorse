# WingedHorse

面向中国大陆用户的 Web/H5 情绪陪伴与轻养成产品。项目当前处于文档基线阶段，业务代码尚未初始化。

核心体验：娱乐问卷 → 个性化角色 → 物品掉落与收集养成 → 数字生命 Agent → 用户主动授权的端侧情绪感知。

## 文档

- [产品需求](docs/PRODUCT_REQUIREMENTS.md)
- [技术架构](docs/TECHNICAL_ARCHITECTURE.md)
- [UI 与角色风格规范](docs/UI_STYLE_GUIDE.md)
- [问卷计分审计](docs/QUESTIONNAIRE_AUDIT.md)
- [安全与合规](docs/SECURITY_COMPLIANCE.md)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)
- [协作与代码规范](AGENTS.md)

## 当前状态

- 已确认产品方向与第一阶段范围。
- 已确认原创 2D 插画角色方向；现有图片只作情绪和题材参考，不作为最终美术源文件。
- 问卷题目已盘点，但计分理论区间存在不一致，修正方案见问卷审计文档。
- 下一步：按实施计划搭建 Monorepo、Web/H5 基础工程和问卷闭环。

## 重要边界

- 产品对外统一称“娱乐测评”，不提供医疗诊断或心理诊断。
- 原始摄像头、视频和音频默认不上传；情绪与心率能力优先端侧推理、主动授权、可关闭。
- OpenRouter 密钥只允许存在于服务端。
- 任何参考品牌只能用于抽象风格研究，禁止复制角色、商标、轮廓和标志性视觉资产。
