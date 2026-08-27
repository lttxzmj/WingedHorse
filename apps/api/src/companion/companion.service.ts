import { Inject, Injectable } from "@nestjs/common";
import type { CompanionMessageRequest, CompanionMessageResponse } from "@wingedhorse/contracts";
import { OpenRouterProvider } from "./openrouter.provider.js";
import { SafetyService } from "./safety.service.js";

const SYSTEM_PROMPT = `你是 WingedHorse 里的 AI 飞马伙伴。你必须明确自己是 AI，不冒充真人、医生或心理咨询师。
语气温暖、短而自然，以倾听和一个可执行的小建议为主。不要诊断，不做医疗承诺，不强化排他依赖，不用签到损失或情感勒索。
不要声称从摄像头准确识别了用户情绪或健康状态。用户可随时跳过、休息、关闭记忆。用简体中文回复，通常不超过 160 字。`;

@Injectable()
export class CompanionService {
  constructor(
    @Inject(OpenRouterProvider) private readonly provider: OpenRouterProvider,
    @Inject(SafetyService) private readonly safety: SafetyService
  ) {}

  async reply(request: CompanionMessageRequest): Promise<CompanionMessageResponse> {
    const level = this.safety.classify(request.message);
    if (level === "urgent") {
      return { reply: this.safety.urgentReply(), source: "safety-flow", safetyLevel: level, aiDisclosure: true, memoryCandidate: null };
    }
    if (!this.provider.available) return this.fallback(request.message, level);

    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 15000);
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 15000);
    try {
      const reply = await this.provider.complete("chat", [
        { role: "system", content: SYSTEM_PROMPT },
        ...(request.memoryEnabled && request.memories.length > 0 ? [{ role: "system" as const, content: `以下是用户主动保存在本机并选择带入的偏好，仅在相关时自然参考，不要逐条复述：\n${request.memories.map((memory) => `- ${memory}`).join("\n")}` }] : []),
        ...request.history.map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: request.message }
      ], controller.signal);
      return { reply, source: "openrouter", safetyLevel: level, aiDisclosure: true, memoryCandidate: null };
    } catch {
      return this.fallback(request.message, level);
    } finally {
      clearTimeout(timeout);
    }
  }

  private fallback(message: string, level: "normal" | "concern"): CompanionMessageResponse {
    const reply = level === "concern"
      ? "听起来你已经撑了很久。先不要求自己马上好起来，好吗？如果可以，联系一个你信任的人，说一句“我今天有点难熬，能陪我说两句吗”。我只是 AI，但可以继续陪你把此刻最难的部分说清楚。"
      : message.includes("累") || message.includes("疲惫")
        ? "听起来今天的电量已经很低了。你不用在这里证明自己还能撑。先喝口水、把肩膀放松十秒也算照顾自己。我是 AI 飞马，想听你说说最消耗你的那一件事。"
        : "我在听。你不用把话组织得很完整，想到哪里就说到哪里。我是 AI 飞马，不能替代现实中的支持，但可以陪你把现在的感受慢慢拆小一点。";
    return { reply, source: "local-fallback", safetyLevel: level, aiDisclosure: true, memoryCandidate: null };
  }
}
