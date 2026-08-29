import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller.js";

describe("AppController", () => {
  it("reports a healthy API without exposing internal details", () => {
    const result = new AppController().health();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("wingedhorse-api");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it("accepts a whitelisted analytics event and rejects unknown names", () => {
    const controller = new AppController();
    expect(
      controller.ingestEvent({
        name: "landing_view",
        occurredAt: "2026-08-29T00:00:00.000Z"
      })
    ).toEqual({ accepted: true });
    expect(() => controller.ingestEvent({ name: "hack", occurredAt: "2026-08-29T00:00:00.000Z" })).toThrow();
  });
});
