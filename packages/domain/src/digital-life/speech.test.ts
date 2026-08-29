import { describe, expect, it } from "vitest";
import { toCharacterSpeech } from "./speech.js";

describe("toCharacterSpeech", () => {
  it("rewrites narrator 它 into first-person 我 for speech bubbles", () => {
    expect(toCharacterSpeech("它把有意思的那一页折了个角，想等你回来一起看。")).toBe(
      "我把有意思的那一页折了个角，想等你回来一起看。"
    );
  });

  it("keeps shared-we wording coherent", () => {
    expect(toCharacterSpeech("你们谁也没催谁。")).toBe("我们谁也没催谁。");
  });
});
