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
});
