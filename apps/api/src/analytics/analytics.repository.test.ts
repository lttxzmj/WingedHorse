import { describe, expect, it } from "vitest";
import { AnalyticsRepository } from "./analytics.repository.js";

const visitor = "a".repeat(43);

describe("AnalyticsRepository", () => {
  it("stores whitelisted events in memory without a database", async () => {
    const repository = new AnalyticsRepository();
    await repository.recordEvent(
      {
        name: "landing_view",
        occurredAt: "2026-08-29T00:00:00.000Z",
        props: { source: "home" }
      },
      visitor
    );
    const stored = repository.listEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe("landing_view");
    expect(stored[0]?.props).toEqual({ source: "home" });
    expect(stored[0]?.visitorHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("stores purchase intent contact without requiring a visitor token", async () => {
    const repository = new AnalyticsRepository();
    await repository.recordIntent("wechat-demo");
    const stored = repository.listIntents();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.contact).toBe("wechat-demo");
    expect(stored[0]?.visitorHash).toBeNull();
    expect(typeof stored[0]?.createdAt).toBe("string");
  });
});
