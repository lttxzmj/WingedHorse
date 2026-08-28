import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionAccessService } from "./companion-access.service.js";
import { CompanionController } from "./companion.controller.js";
import { SafetyService } from "./safety.service.js";

const body = {
  sessionId: "session-controller-test",
  message: "陪我聊聊",
  history: [],
  memories: [],
  memoryEnabled: false
};

afterEach(() => {
  delete process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE;
  delete process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE;
});

describe("CompanionController access policy", () => {
  it("returns a stable 429 code after the application limit", async () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "1";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "1";
    const companion = { reply: vi.fn().mockResolvedValue({ ok: true }) };
    const controller = new CompanionController(
      companion as never,
      new CompanionAccessService(),
      new SafetyService()
    );
    const request = { ip: "203.0.113.10" } as never;
    await expect(controller.message(body, request)).resolves.toEqual({ ok: true });
    await expect(controller.message(body, request)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { code: "COMPANION_RATE_LIMITED" }
    });
  });

  it("keeps the fixed urgent safety flow available when normal chat is limited", async () => {
    const access = { checkRequest: vi.fn().mockReturnValue({ allowed: false }) };
    const companion = { reply: vi.fn().mockResolvedValue({ source: "safety-flow" }) };
    const controller = new CompanionController(
      companion as never,
      access as never,
      new SafetyService()
    );
    await expect(
      controller.message({ ...body, message: "我想自杀" }, { ip: "203.0.113.10" } as never)
    ).resolves.toEqual({ source: "safety-flow" });
    expect(access.checkRequest).not.toHaveBeenCalled();
  });
});
