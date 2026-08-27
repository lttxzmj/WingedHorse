import { Link } from "@tanstack/react-router";

type LegalKind = "privacy" | "terms" | "ai";

const CONTENT: Record<
  LegalKind,
  { eyebrow: string; title: string; sections: Array<{ title: string; body: string }> }
> = {
  privacy: {
    eyebrow: "隐私说明 · 草案",
    title: "少收一点，说明白一点",
    sections: [
      {
        title: "我们处理什么",
        body: "当前版本的问卷答案、结果、背包和养成值默认保存在你的浏览器本机。聊天消息会在你发送时传给 WingedHorse 服务端，并可能由服务端转发给配置的 OpenRouter 模型服务商。"
      },
      {
        title: "摄像头",
        body: "摄像头只在你主动进入实验功能并单独勾选同意后开启。画面仅在浏览器内存中处理，不上传、不保存、不录音；页面退出或点击停止即结束轨道。趣味脉搏趋势及画面稳定度不会自动存储。"
      },
      {
        title: "第三方与跨境",
        body: "OpenRouter 及其模型提供方可能位于境外。正式上线前必须完成处理方、数据保留和跨境合规评估；敏感生物识别或健康数据默认不发送给模型。"
      },
      {
        title: "你的权利",
        body: "你可以在设置中清除本机数据、拒绝摄像头并继续使用核心功能。账号、云同步、数据导出和服务端删除功能启用前不得宣称已经提供。"
      }
    ]
  },
  terms: {
    eyebrow: "用户协议 · 草案",
    title: "这是陪伴产品，不是诊疗服务",
    sections: [
      {
        title: "产品定位",
        body: "问卷结果、角色反馈、游戏和状态线索均为娱乐与自我观察用途，不构成心理、医疗、职业或其他专业建议。"
      },
      {
        title: "安全使用",
        body: "如你或他人面临即时人身危险，请优先联系身边可信任的人、当地紧急服务或前往急诊，不要依赖本产品处理紧急情况。"
      },
      {
        title: "内容与账号",
        body: "请勿利用服务违法、伤害他人、攻击系统或提交无权处理的个人信息。正式商业发布前，本草案需要由专业法律顾问结合运营主体、年龄范围和备案情况审阅。"
      }
    ]
  },
  ai: {
    eyebrow: "AI 生成内容说明",
    title: "飞马是 AI，不是真人",
    sections: [
      {
        title: "它能做什么",
        body: "它可以倾听、帮助梳理感受、提供温和的小行动建议，也可能因为模型限制而误解你或给出不准确内容。"
      },
      {
        title: "它不会做什么",
        body: "它不冒充真人、医生或心理咨询师，不做诊断，不承诺治愈，不要求你只依赖它，也不会因为你离开或中断使用而惩罚你。"
      },
      {
        title: "安全分流",
        body: "系统会用本地规则识别部分紧急风险表达并提供固定安全提示。规则可能漏判，模型回复也不能替代现实支持和紧急服务。AI 生成内容在产品中持续以 AI 标识呈现。"
      }
    ]
  }
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const content = CONTENT[kind];
  return (
    <main className="legal-page">
      <header className="subpage-header">
        <Link to="/settings">←</Link>
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
        </div>
        <span>2026-08-27</span>
      </header>
      <div className="legal-body">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <p className="legal-draft">
        这是产品工程草案，不替代正式法律意见。大陆正式上线前必须由合格专业人员复核。
      </p>
    </main>
  );
}
