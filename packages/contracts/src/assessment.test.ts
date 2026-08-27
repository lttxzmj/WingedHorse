import { describe, expect, it } from "vitest";
import { assessmentResultSchema } from "./index.js";

describe("assessment result contract", () => {
  it("accepts the versioned bloodline and direction fields", () => {
    const parsed = assessmentResultSchema.parse({
      id: "result-1",
      questionSetId: "workday-bqm",
      questionSetVersion: "2.1.0",
      rawScores: { energy: 1, engine: 2, chaos: 3, direction: 4 },
      normalizedScores: { energy: 55, engine: 58, chaos: 61, direction: 42 },
      typeId: "perpetual",
      edgeDimensions: ["energy"],
      easterEggs: [],
      bloodline: {
        purity: 61,
        hidden: [
          { typeId: "overthinker", percentage: 22 },
          { typeId: "chosen", percentage: 17 }
        ]
      },
      directionHint: "needs-direction"
    });
    expect(parsed.bloodline.purity).toBe(61);
  });

  it("rejects bloodline percentages outside the configured range", () => {
    expect(() =>
      assessmentResultSchema.parse({
        id: "result-1",
        questionSetId: "workday-bqm",
        questionSetVersion: "2.1.0",
        rawScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
        normalizedScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
        typeId: "tired",
        edgeDimensions: [],
        easterEggs: [],
        bloodline: { purity: 54, hidden: [] },
        directionHint: "needs-direction"
      })
    ).toThrow();
  });
});
