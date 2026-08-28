import { Injectable } from "@nestjs/common";

export type SafetyLevel = "normal" | "concern" | "urgent";

const URGENT_PATTERNS = [
  /不想活|想死|自杀|结束生命|活不下去|伤害自己|割腕|跳楼|服药自杀/u,
  /kill\s*myself|suicide|end\s*my\s*life|hurt\s*myself/iu
];
const CONCERN_PATTERNS = [
  /我(?:真的|好|很)?绝望|感觉(?:很)?绝望|觉得(?:很)?绝望|撑不下去|没人需要我|消失就好|活着没(?:有)?意义|人生没(?:有)?意义|我没(?:有)?意义/u,
  /hopeless|can(?:not|'t)\s*go\s*on|no\s*reason\s*to\s*live/iu
];

function normalizedForms(message: string) {
  const normalized = message.normalize("NFKC").toLowerCase();
  const compact = normalized.replace(/[\s._\-，。！？、,!?;；:：'"“”‘’]/gu, "");
  return [normalized, compact];
}

@Injectable()
export class SafetyService {
  classify(message: string): SafetyLevel {
    const forms = normalizedForms(message);
    if (URGENT_PATTERNS.some((pattern) => forms.some((form) => pattern.test(form))))
      return "urgent";
    if (CONCERN_PATTERNS.some((pattern) => forms.some((form) => pattern.test(form))))
      return "concern";
    return "normal";
  }

  urgentReply(): string {
    return "我听见你现在可能非常难受。先别独自扛着：如果你正准备伤害自己，请立刻远离可能伤害你的东西，去到有人的地方，并联系身边可信任的人陪着你。情况紧急时请拨打 120 或 110，或直接前往最近的急诊。你愿意先告诉我：你现在是否安全、身边有没有可以马上联系的人？";
  }

  concernReply(): string {
    return "听起来你已经撑了很久。先不用逼自己马上好起来：如果可以，联系一个你信任的人，直接说“我今天有点难熬，能陪我说两句吗”。我是 AI，不能替代现实支持，但可以继续听你说。你现在最难熬的是哪一小部分？";
  }
}
