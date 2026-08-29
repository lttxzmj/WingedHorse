import { describe, expect, it } from "vitest";
import { AnalyticsRepository } from "./analytics/analytics.repository.js";
import { AppController } from "./app.controller.js";

describe("AppController", () => {
  it("reports a healthy API without exposing internal details", () => {
    const result = new AppController().health();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("wingedhorse-api");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it("persists a whitelisted analytics event and rejects unknown names", async () => {
    const analytics = new AnalyticsRepository();
    const controller = new AppController(analytics);
    await expect(
      controller.ingestEvent({
        name: "landing_view",
        occurredAt: "2026-08-29T00:00:00.000Z"
      })
    ).resolves.toEqual({ accepted: true });
    expect(analytics.listEvents()).toHaveLength(1);
    expect(analytics.listEvents()[0]?.name).toBe("landing_view");
    await expect(
      controller.ingestEvent({ name: "hack", occurredAt: "2026-08-29T00:00:00.000Z" })
    ).rejects.toThrow();
  });

  it("persists a purchase intent contact", async () => {
    const analytics = new AnalyticsRepository();
    const controller = new AppController(analytics);
    await expect(controller.ingestIntent({ contact: " demo@example.com " })).resolves.toEqual({
      accepted: true
    });
    expect(analytics.listIntents()[0]?.contact).toBe("demo@example.com");
    await expect(controller.ingestIntent({ contact: "x" })).rejects.toThrow();
  });
});
