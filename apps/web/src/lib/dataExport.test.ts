import { INITIAL_PET_VITALS } from "@wingedhorse/domain";
import { describe, expect, it } from "vitest";
import { createUserDataExport } from "./dataExport";

describe("createUserDataExport", () => {
  it("exports the documented local fields without internal credentials or session ids", () => {
    const payload = createUserDataExport(
      {
        answers: { q1: "a" },
        assessmentIndex: 1,
        assessmentVersion: "2.1.0",
        result: null,
        inventory: {},
        petVitals: INITIAL_PET_VITALS,
        gamesPlayed: 1,
        relationshipXp: 8,
        lifeEvents: [],
        dailyPlan: null,
        worldContext: null,
        manualMood: "flat",
        memories: [],
        resultFeedback: null,
        lifeSyncEnabled: false,
        hardwareLink: false,
        deviceId: ""
      },
      "2026-08-28T12:00:00.000Z"
    );
    const json = JSON.stringify(payload);

    expect(payload.scope).toBe("current-device");
    expect(payload.data.answers).toEqual({ q1: "a" });
    expect(json).not.toContain("visitorToken");
    expect(json).not.toContain("assessmentOptionSeed");
    expect(json).not.toContain("settledGameIds");
    expect(json).not.toContain("cloudPlayerRevision");
  });
});
