import { describe, expect, it, vi } from "vitest";
import { CompanionService } from "./companion.service.js";
import { SafetyService } from "./safety.service.js";

const request = {
  sessionId: "session-12345678",
  message: "今天有点累",
  history: [],
  memories: [],
  memoryEnabled: false
};

describe("CompanionService", () => {
  it("uses a transparent local fallback without configuration", async () => {
    const provider = { available: false, complete: vi.fn() };
    const service = new CompanionService(provider as never, new SafetyService());
    const result = await service.reply(request);
    expect(result.source).toBe("local-fallback");
    expect(result.aiDisclosure).toBe(true);
    expect(result.reply).toContain("AI");
  });

  it("never sends urgent messages to the model", async () => {
    const provider = { available: true, complete: vi.fn() };
    const service = new CompanionService(provider as never, new SafetyService());
    const result = await service.reply({ ...request, message: "我想自杀" });
    expect(result.source).toBe("safety-flow");
    expect(result.safetyLevel).toBe("urgent");
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("answers life questions from domain facts without sending them to OpenRouter", async () => {
    const provider = { available: true, complete: vi.fn() };
    const service = new CompanionService(provider as never, new SafetyService());
    const result = await service.reply({
      ...request,
      message: "你今天做了什么？",
      lifeContext: {
        typeId: "tired",
        world: {
          dateKey: "2026-08-28",
          period: "evening",
          timezoneOffsetMinutes: -480,
          localHour: 20
        },
        plan: { id: "plan:test", dateKey: "2026-08-28", motive: "recharge", slots: [] },
        vitals: { energy: 20, engine: 50, chaos: 40, direction: 60 },
        relationshipXp: 12,
        recentEvents: [
          {
            title: "把自己卷进毯子里",
            body: "醒来以后，它宣布休息也算今日事项。",
            occurredAt: "2026-08-28T12:00:00.000Z"
          }
        ],
        inventory: [{ name: "午睡眼罩", count: 1 }]
      }
    });
    expect(result.source).toBe("domain-grounded");
    expect(result.reply).toContain("把自己卷进毯子里");
    expect(provider.complete).not.toHaveBeenCalled();
  });
});
