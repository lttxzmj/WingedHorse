import {
  companionStreamEventSchema,
  companionRateLimitErrorSchema,
  type CompanionMessageRequest,
  type CompanionMessageResponse
} from "@wingedhorse/contracts";

const STREAM_BUFFER_LIMIT = 16_384;

export class CompanionStreamError extends Error {
  constructor(
    readonly code: "COMPANION_RATE_LIMITED" | "COMPANION_STREAM_UNAVAILABLE",
    readonly retryAfterSeconds?: number
  ) {
    super(code);
  }
}

export async function readCompanionStream(
  response: Response,
  onPartial: (content: string) => void
): Promise<CompanionMessageResponse> {
  if (!response.ok) {
    const parsed = companionRateLimitErrorSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success)
      throw new CompanionStreamError(parsed.data.code, parsed.data.retryAfterSeconds);
    throw new CompanionStreamError("COMPANION_STREAM_UNAVAILABLE");
  }
  if (!response.body) throw new CompanionStreamError("COMPANION_STREAM_UNAVAILABLE");
  if (!response.headers.get("content-type")?.includes("application/x-ndjson"))
    throw new Error("COMPANION_STREAM_CONTENT_TYPE");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let completed: CompanionMessageResponse | null = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (done && buffer) buffer += "\n";
      const lines = buffer.split(/\r?\n/u);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let json: unknown;
        try {
          json = JSON.parse(line);
        } catch {
          throw new Error("COMPANION_STREAM_JSON");
        }
        const parsed = companionStreamEventSchema.safeParse(json);
        if (!parsed.success) throw new Error("COMPANION_STREAM_EVENT");
        const event = parsed.data;
        if (completed) throw new Error("COMPANION_STREAM_EVENT_AFTER_DONE");
        if (event.type === "delta") {
          content = `${content}${event.delta}`.slice(0, 1_200);
          onPartial(content);
        } else if (event.type === "replace") {
          content = event.content;
          onPartial(content);
        } else {
          completed = event.response;
          content = event.response.reply;
          onPartial(content);
        }
      }
      if (done) break;
      if (buffer.length > STREAM_BUFFER_LIMIT) throw new Error("COMPANION_STREAM_BUFFER_LIMIT");
    }
  } finally {
    reader.releaseLock();
  }
  if (!completed) throw new Error("COMPANION_STREAM_INCOMPLETE");
  return completed;
}

export async function streamCompanionMessage(
  payload: CompanionMessageRequest,
  onPartial: (content: string) => void,
  signal?: AbortSignal
): Promise<CompanionMessageResponse> {
  const response = await fetch("/api/companion/messages/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify(payload),
    signal: signal ?? null
  });
  return readCompanionStream(response, onPartial);
}
