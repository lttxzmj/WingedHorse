import { Injectable } from "@nestjs/common";

export type SafetyLevel = "normal" | "concern" | "urgent";

const URGENT_PATTERNS = [
  /不想活|想死|自杀|结束生命|活不下去|伤害自己|割腕|跳楼|服药自杀/u,
  /kill myself|suicide|end my life|hurt myself/iu
];
const CONCERN_PATTERNS = [
  /绝望|撑不下去|没人需要我|消失就好|没有意义/u,
  /hopeless|can't go on|no reason to live/iu
];

@Injectable()
export class SafetyService {
  classify(message: string): SafetyLevel {
    if (URGENT_PATTERNS.some((pattern) => pattern.test(message))) return "urgent";
    if (CONCERN_PATTERNS.some((pattern) => pattern.test(message))) return "concern";
    return "normal";
  }

  urgentReply(): string {
    return "我听见你现在可能非常难受。先别独自扛着：如果你正准备伤害自己，请立刻远离可能伤害你的东西，去到有人的地方，并联系身边可信任的人陪着你。情况紧急时请拨打 120 或 110，或直接前往最近的急诊。你愿意先告诉我：你现在是否安全、身边有没有可以马上联系的人？";
  }
}
