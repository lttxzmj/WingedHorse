import { describe, expect, it } from "vitest";
import { deriveCompanionGrowth } from "./growth.js";

describe("deriveCompanionGrowth", () => {
  it.each([
    [0, "arrival", 0],
    [9, "arrival", 90],
    [10, "familiar", 0],
    [24, "familiar", 93],
    [25, "trusted", 0],
    [60, "wingmate", 100]
  ] as const)("maps %s XP to %s", (xp, id, progressPercent) => {
    expect(deriveCompanionGrowth(xp)).toMatchObject({ id, progressPercent });
  });

  it("clamps invalid relationship values into the supported range", () => {
    expect(deriveCompanionGrowth(-20).id).toBe("arrival");
    expect(deriveCompanionGrowth(8_000).id).toBe("wingmate");
  });
});
