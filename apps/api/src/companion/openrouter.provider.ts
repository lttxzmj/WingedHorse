import { Injectable } from "@nestjs/common";
import { z } from "zod";

interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 模型任务类型，对应 docs/TECHNICAL_ARCHITECTURE.md §3 的 Model Policy。
 * 高风险分类不走模型，由 SafetyService 的规则化流程处理（fail-safe、零成本零延迟）。
 */
export type ModelTask = "chat" | "summary" | "vision";

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().max(4_000) }) })).min(1)
});
const streamChunkSchema = z.object({
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().optional() }).passthrough()
    })
  )
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

  async complete(
    task: ModelTask,
    messages: ProviderMessage[],
    signal?: AbortSignal
  ): Promise<string> {
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
    const content = parsed.data.choices[0]!.message.content.trim();
    if (!content) throw new Error("OPENROUTER_EMPTY_RESPONSE");
    return content.slice(0, 1_200);
  }

  async *completeStream(
    task: ModelTask,
    messages: ProviderMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<string> {
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
        stream: true,
        provider: { data_collection: "deny", zdr: true }
      }),
      signal: signal ?? null
    });
    if (!response.ok || !response.body) throw new Error(`OPENROUTER_STREAM_${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        if (done && buffer) buffer += "\n";
        const lines = buffer.split(/\r?\n/u);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let json: unknown;
          try {
            json = JSON.parse(data);
          } catch {
            throw new Error("OPENROUTER_INVALID_STREAM_JSON");
          }
          const parsed = streamChunkSchema.safeParse(json);
          if (!parsed.success) throw new Error("OPENROUTER_INVALID_STREAM_CHUNK");
          const content = parsed.data.choices[0]?.delta.content ?? "";
          if (!content) continue;
          const remaining = 1_200 - totalLength;
          if (remaining <= 0) {
            await reader.cancel("OUTPUT_LIMIT");
            return;
          }
          const accepted = content.slice(0, remaining);
          totalLength += accepted.length;
          yield accepted;
          if (accepted.length < content.length) {
            await reader.cancel("OUTPUT_LIMIT");
            return;
          }
        }
        if (done) break;
        if (buffer.length > 16_384) throw new Error("OPENROUTER_STREAM_BUFFER_LIMIT");
      }
    } finally {
      reader.releaseLock();
    }
  }
}
