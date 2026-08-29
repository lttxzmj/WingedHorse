import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterProvider } from "./openrouter.provider.js";

const ENV_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_CHAT_MODEL",
  "OPENROUTER_SUMMARY_MODEL",
  "OPENROUTER_VISION_MODEL",
  "OPENROUTER_BASE_URL"
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

describe("OpenRouterProvider model policy", () => {
  it("resolves chat from its own slot", () => {
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    const provider = new OpenRouterProvider();
    expect(provider.resolveModel("chat")).toBe("deepseek/deepseek-chat");
  });

  it("falls back summary to chat when summary model is unset", () => {
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    const provider = new OpenRouterProvider();
    expect(provider.resolveModel("summary")).toBe("deepseek/deepseek-chat");
  });

  it("does not fall back vision to chat", () => {
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    const provider = new OpenRouterProvider();
    expect(provider.resolveModel("vision")).toBeUndefined();
    process.env.OPENROUTER_VISION_MODEL = "qwen/qwen3-vl-30b-a3b-thinking";
    expect(provider.resolveModel("vision")).toBe("qwen/qwen3-vl-30b-a3b-thinking");
  });

  it("is unavailable without a chat model or key", () => {
    expect(new OpenRouterProvider().available).toBe(false);
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    expect(new OpenRouterProvider().available).toBe(false);
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    expect(new OpenRouterProvider().available).toBe(true);
  });

  it("parses SSE chunks split across transport boundaries", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    const encoder = new TextEncoder();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"先'));
              controller.enqueue(
                encoder.encode('慢"}}]}\n\ndata: {"choices":[{"delta":{"content":"一点"}}]}\n')
              );
              controller.enqueue(encoder.encode("\ndata: [DONE]\n\n"));
              controller.close();
            }
          }),
          { status: 200 }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const output: string[] = [];
    for await (const delta of new OpenRouterProvider().completeStream("chat", []))
      output.push(delta);
    expect(output).toEqual(["先慢", "一点"]);
    const [requestedUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    if (typeof requestInit?.body !== "string") throw new Error("EXPECTED_STRING_BODY");
    expect(requestInit.body).toContain('"stream":true');
  });

  it("rejects malformed upstream SSE JSON", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.OPENROUTER_CHAT_MODEL = "deepseek/deepseek-chat";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("data: nope\n\n", { status: 200 }))
    );
    const consume = async () => {
      for await (const _ of new OpenRouterProvider().completeStream("chat", [])) void _;
    };
    await expect(consume()).rejects.toThrow("OPENROUTER_INVALID_STREAM_JSON");
  });
});
