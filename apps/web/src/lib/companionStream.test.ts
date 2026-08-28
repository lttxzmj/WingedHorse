import type { CompanionMessageResponse } from "@wingedhorse/contracts";
import { describe, expect, it } from "vitest";
import { readCompanionStream } from "./companionStream";

const doneResponse: CompanionMessageResponse = {
  reply: "先慢一点。",
  source: "openrouter",
  safetyLevel: "normal",
  aiDisclosure: true,
  memoryCandidate: null
};

function responseFrom(chunks: string[], contentType = "application/x-ndjson") {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    }),
    { status: 200, headers: { "Content-Type": contentType } }
  );
}

describe("readCompanionStream", () => {
  it("reassembles split NDJSON chunks and reports partial text", async () => {
    const partials: string[] = [];
    const response = responseFrom([
      '{"type":"delta","delta":"先慢',
      '"}\n{"type":"delta","delta":"一点。"}\n',
      `${JSON.stringify({ type: "done", response: doneResponse })}\n`
    ]);
    await expect(readCompanionStream(response, (value) => partials.push(value))).resolves.toEqual(
      doneResponse
    );
    expect(partials).toEqual(["先慢", "先慢一点。", "先慢一点。"]);
  });

  it("replaces a partial model answer when the server falls back", async () => {
    const fallback = { ...doneResponse, reply: "我还在这里。", source: "local-fallback" as const };
    const partials: string[] = [];
    const response = responseFrom([
      `${JSON.stringify({ type: "delta", delta: "半句" })}\n`,
      `${JSON.stringify({ type: "replace", content: fallback.reply })}\n`,
      `${JSON.stringify({ type: "done", response: fallback })}\n`
    ]);
    await expect(readCompanionStream(response, (value) => partials.push(value))).resolves.toEqual(
      fallback
    );
    expect(partials.at(-1)).toBe("我还在这里。");
  });

  it("rejects malformed or incomplete streams", async () => {
    await expect(readCompanionStream(responseFrom(["{}\n"]), () => undefined)).rejects.toThrow(
      "COMPANION_STREAM_EVENT"
    );
    await expect(
      readCompanionStream(responseFrom(['{"type":"delta","delta":"半句"}\n']), () => undefined)
    ).rejects.toThrow("COMPANION_STREAM_INCOMPLETE");
  });

  it("preserves a validated rate-limit response for the UI", async () => {
    const response = new Response(
      JSON.stringify({
        code: "COMPANION_RATE_LIMITED",
        message: "消息有点密，请稍后再试",
        retryAfterSeconds: 37
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
    await expect(readCompanionStream(response, () => undefined)).rejects.toMatchObject({
      code: "COMPANION_RATE_LIMITED",
      retryAfterSeconds: 37
    });
  });
});
