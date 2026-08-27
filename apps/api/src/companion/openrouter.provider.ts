import { Injectable } from "@nestjs/common";
import { z } from "zod";

interface ProviderMessage { role: "system" | "user" | "assistant"; content: string; }

/**
 * 模型任务类型，对应 docs/TECHNICAL_ARCHITECTURE.md §3 的 Model Policy。
 * 高风险分类不走模型，由 SafetyService 的规则化流程处理（fail-safe、零成本零延迟）。
 */
export type ModelTask = "chat" | "summary" | "vision";

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1)
});

/** 按任务解析模型 ID；summary 缺省回退 chat，vision 不跨任务回退（需视觉能力）。 */
function resolveModel(task: ModelTask): string | undefined {
  switch (task) {
    case "chat":
      return process.env.OPENROUTER_CHAT_MODEL;
    case "summary":
      return process.env.OPENROUTER_SUMMARY_MODEL ?? process.env.OPENROUTER_CHAT_MODEL;
    case "vision":
      return process.env.OPENROUTER_VISION_MODEL;
  }
}

@Injectable()
export class OpenRouterProvider {
  private get endpoint(): string {
    return `${process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"}/chat/completions`;
  }

  get available(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY && resolveModel("chat"));
  }

  resolveModel(task: ModelTask): string | undefined {
    return resolveModel(task);
  }

  async complete(task: ModelTask, messages: ProviderMessage[], signal?: AbortSignal): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    const model = resolveModel(task);
    if (!key || !model) throw new Error("OPENROUTER_NOT_CONFIGURED");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
        "X-Title": "WingedHorse"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 320,
        provider: { data_collection: "deny", zdr: true }
      }),
      signal: signal ?? null
    });
    if (!response.ok) throw new Error(`OPENROUTER_HTTP_${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("OPENROUTER_INVALID_RESPONSE");
    return parsed.data.choices[0]!.message.content.trim();
  }
}
