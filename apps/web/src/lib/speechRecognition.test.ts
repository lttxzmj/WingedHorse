import { describe, expect, it } from "vitest";
import { containsWakePhrase, stripWakePhrase } from "./speechRecognition";

describe("speechRecognition helpers", () => {
  it("detects the wake phrase with light spacing variants", () => {
    expect(containsWakePhrase("牛马来来")).toBe(true);
    expect(containsWakePhrase("嗯，牛马 来来，今天有点累")).toBe(true);
    expect(containsWakePhrase("今天有点累")).toBe(false);
  });

  it("strips the wake phrase before filling the draft", () => {
    expect(stripWakePhrase("牛马来来，今天有点累")).toBe("今天有点累");
    expect(stripWakePhrase("牛马来来今天有点累")).toBe("今天有点累");
  });
});
