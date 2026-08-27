import { afterEach, describe, expect, it } from "vitest";
import { OpenRouterProvider } from "./openrouter.provider.js";

const ENV_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_CHAT_MODEL",
  "OPENROUTER_SUMMARY_MODEL",
  "OPENROUTER_VISION_MODEL"
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
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
});
