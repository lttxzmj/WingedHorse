import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionAccessService } from "./companion-access.service.js";
import { CompanionController } from "./companion.controller.js";
import { SafetyService } from "./safety.service.js";

const VISITOR = "a".repeat(43);
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
  delete process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY;
});

describe("CompanionController access policy", () => {
  it("rejects companion use without a visitor token", async () => {
    const companion = { reply: vi.fn() };
    const controller = new CompanionController(
      companion as never,
      new CompanionAccessService(),
      new SafetyService()
    );
    await expect(
      controller.message(body, { ip: "203.0.113.10" } as never, undefined)
    ).rejects.toMatchObject({
      response: { code: "VISITOR_TOKEN_REQUIRED" }
    });
    expect(companion.reply).not.toHaveBeenCalled();
  });

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
    await expect(controller.message(body, request, VISITOR)).resolves.toEqual({ ok: true });
    await expect(controller.message(body, request, VISITOR)).rejects.toMatchObject({
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
      controller.message({ ...body, message: "我想自杀" }, { ip: "203.0.113.10" } as never, VISITOR)
    ).resolves.toEqual({ source: "safety-flow" });
    expect(access.checkRequest).not.toHaveBeenCalled();
  });

  it("returns the remaining device daily quota", async () => {
    process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY = "15";
    const controller = new CompanionController(
      { reply: vi.fn() } as never,
      new CompanionAccessService(),
      new SafetyService()
    );
    await expect(controller.quota(VISITOR)).resolves.toMatchObject({
      limit: 15,
      used: 0,
      remaining: 15
    });
  });
});
