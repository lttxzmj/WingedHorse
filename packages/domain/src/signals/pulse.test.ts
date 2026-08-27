import { describe, expect, it } from "vitest";
import { classifyVisualActivity, estimatePulse, type ColorSample } from "./pulse.js";

function createSignal(bpm: number): ColorSample[] {
  return Array.from({ length: 120 }, (_, index) => ({
    timestampMs: index * 100,
    green: 110 + 4 * Math.sin(2 * Math.PI * (bpm / 60) * (index / 10)),
    motion: 1
  }));
}

describe("experimental pulse estimator", () => {
  it("finds a clean synthetic pulse", () => {
    const result = estimatePulse(createSignal(72));
    expect(result.bpm).toBeGreaterThanOrEqual(71);
    expect(result.bpm).toBeLessThanOrEqual(73);
  });

  it("refuses short or moving samples", () => {
    expect(estimatePulse(createSignal(72).slice(0, 20)).bpm).toBeNull();
    const moving = createSignal(72).map((sample) => ({ ...sample, motion: 20 }));
    expect(estimatePulse(moving).bpm).toBeNull();
    expect(classifyVisualActivity(moving)).toBe("moving");
  });
});
