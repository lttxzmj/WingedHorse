import { describe, expect, it } from "vitest";
import { deriveCompanionPrairieState, getTimeOfDay } from "./prairie-state.js";

describe("Companion Prairie State & Tree-hole Sensing", () => {
  it("determines time of day accurately", () => {
    expect(getTimeOfDay(new Date("2026-08-29T07:30:00"))).toBe("dawn");
    expect(getTimeOfDay(new Date("2026-08-29T11:00:00"))).toBe("day");
    expect(getTimeOfDay(new Date("2026-08-29T15:20:00"))).toBe("afternoon");
    expect(getTimeOfDay(new Date("2026-08-29T19:45:00"))).toBe("dusk");
    expect(getTimeOfDay(new Date("2026-08-29T23:30:00"))).toBe("night");
    expect(getTimeOfDay(new Date("2026-08-29T03:00:00"))).toBe("night");
  });

  it("reflects tired mood and tree-hole support when energy is low", () => {
    const state = deriveCompanionPrairieState({
      typeId: "chosen",
      vitals: { energy: 20, engine: 50, chaos: 30, direction: 50 },
      relationshipXp: 30,
      now: new Date("2026-08-29T15:00:00")
    });

    expect(state.visualMood).toBe("tired");
    expect(state.bubbleSpeech).toContain("有我陪你");
    expect(state.growth.id).toBe("trusted");
  });

  it("reflects night ambient and gentle companion tone", () => {
    const state = deriveCompanionPrairieState({
      typeId: "chosen",
      vitals: { energy: 60, engine: 60, chaos: 30, direction: 60 },
      relationshipXp: 65,
      now: new Date("2026-08-29T23:45:00")
    });

    expect(state.timeOfDay).toBe("night");
    expect(state.bubbleSpeech).toContain("还没睡吗");
    expect(state.growth.id).toBe("wingmate");
  });

  it("prioritizes recent event feedback like game-haul", () => {
    const state = deriveCompanionPrairieState({
      typeId: "chosen",
      vitals: { energy: 60, engine: 60, chaos: 30, direction: 60 },
      relationshipXp: 10,
      latestEvent: {
        id: "evt-1",
        eventKey: "game-haul:1",
        kind: "game-haul",
        occurredAt: new Date().toISOString(),
        title: "补给雨顺利收工",
        body: "接住多少都算收获。",
        typeId: "chosen",
        source: "user-action",
        liked: false,
        saved: false
      }
    });

    expect(state.bubbleSpeech).toContain("刚才接到的东西我都收好啦");
  });
});
