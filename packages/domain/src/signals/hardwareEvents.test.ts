import { describe, expect, it } from "vitest";
import {
  evaluateStressLevel,
  getTouchReaction,
  getWorkerPresenceMessage,
  deriveHardwareEvent
} from "./hardwareEvents.js";

describe("Hardware Events and Stress Assessment", () => {
  it("evaluates pressure levels correctly", () => {
    expect(evaluateStressLevel(400)).toBe("calm");
    expect(evaluateStressLevel(1200)).toBe("moderate");
    expect(evaluateStressLevel(2500)).toBe("high");
    expect(evaluateStressLevel(3800)).toBe("intense");
  });

  it("produces character-aligned touch reactions", () => {
    const explosiveReaction = getTouchReaction("explosive", "intense");
    expect(explosiveReaction).toContain("高压锅");

    const veteranReaction = getTouchReaction("veteran", "high");
    expect(veteranReaction).toContain("靠谱");

    const savingReaction = getTouchReaction("saving", "intense");
    expect(savingReaction).toContain("低功耗");
  });

  it("derives boss alert in gaming context and worker presence in idle context", () => {
    const gamingEvent = deriveHardwareEvent(
      { deviceId: "lamp-001", obstacle: true },
      { inGame: true, horseTypeId: "chosen" }
    );
    expect(gamingEvent?.type).toBe("boss_alert");

    const idleEvent = deriveHardwareEvent(
      { deviceId: "lamp-001", obstacle: true },
      { inGame: false, horseTypeId: "chosen" }
    );
    expect(idleEvent?.type).toBe("worker_presence");
  });
});
