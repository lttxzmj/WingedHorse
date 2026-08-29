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

    const presenceMessage = getWorkerPresenceMessage("explosive");
    expect(presenceMessage).toContain("归位");
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

  it("derives climate events from DHT telemetry", () => {
    // 1. Dry humidity -> climate_dry + memoryFact
    const dryEvent = deriveHardwareEvent({
      deviceId: "lamp-001",
      dht: { temperature: 24.5, humidity: 32 }
    });
    expect(dryEvent?.type).toBe("climate_dry");
    if (dryEvent?.type === "climate_dry") {
      expect(dryEvent.humidity).toBe(32);
      expect(dryEvent.itemId).toBe("iced-americano");
      expect(dryEvent.memoryFact).toContain("干燥");
    }

    // 2. High temperature -> climate_hot
    const hotEvent = deriveHardwareEvent({
      deviceId: "lamp-001",
      dht: { temperature: 28.5, humidity: 55 },
      led1: "blinking"
    });
    expect(hotEvent?.type).toBe("climate_hot");
    if (hotEvent?.type === "climate_hot") {
      expect(hotEvent.temperature).toBe(28.5);
      expect(hotEvent.itemId).toBe("iced-americano");
      expect(hotEvent.memoryFact).toContain("偏高");
    }

    // 3. High humidity -> climate_humid
    const humidEvent = deriveHardwareEvent({
      deviceId: "lamp-001",
      dht: { temperature: 24, humidity: 92 },
      led2: "breathing"
    });
    expect(humidEvent?.type).toBe("climate_humid");
    if (humidEvent?.type === "climate_humid") {
      expect(humidEvent.memoryFact).toContain("开窗");
    }

    // 4. Low temperature -> climate_cold
    const coldEvent = deriveHardwareEvent({
      deviceId: "lamp-001",
      dht: { temperature: 17.5, humidity: 50 }
    });
    expect(coldEvent?.type).toBe("climate_cold");
    if (coldEvent?.type === "climate_cold") {
      expect(coldEvent.itemId).toBe("nap-mask");
      expect(coldEvent.memoryFact).toContain("偏低");
    }
  });
});
