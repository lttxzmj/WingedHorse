import { describe, expect, it } from "vitest";
import { advanceDigitalLife, createWorldContext, selectLifeMotive } from "./engine.js";

const base = {
  visitorId: "visitor-12345678",
  typeId: "tired" as const,
  timezoneOffsetMinutes: -480,
  vitals: { energy: 20, engine: 50, chaos: 40, direction: 60 },
  relationshipXp: 20,
  events: []
};

describe("digital life engine", () => {
  it("uses the user's local day and period", () => {
    expect(createWorldContext("2026-08-28T01:30:00.000Z", -480)).toMatchObject({
      dateKey: "2026-08-28",
      period: "morning",
      localHour: 9
    });
  });

  it("selects a motive from the weakest care dimension", () => {
    expect(selectLifeMotive(base.vitals, base.relationshipXp)).toBe("recharge");
    expect(selectLifeMotive(base.vitals, 2)).toBe("connect");
  });

  it("lazily advances elapsed plan slots without duplicating retries", () => {
    const first = advanceDigitalLife({ ...base, now: "2026-08-28T06:00:00.000Z" });
    expect(first.generatedEvents).toHaveLength(2);
    expect(first.events.every((event) => event.source === "daily-plan")).toBe(true);

    const retry = advanceDigitalLife({
      ...base,
      now: "2026-08-28T06:00:00.000Z",
      events: first.events,
      previousPlan: first.plan
    });
    expect(retry.generatedEvents).toHaveLength(0);
    expect(retry.events).toEqual(first.events);
  });

  it("creates a new deterministic plan on the next local day", () => {
    const first = advanceDigitalLife({ ...base, now: "2026-08-28T14:00:00.000Z" });
    const next = advanceDigitalLife({
      ...base,
      now: "2026-08-29T02:00:00.000Z",
      events: first.events,
      previousPlan: first.plan
    });
    expect(next.plan.dateKey).toBe("2026-08-29");
    expect(next.plan.id).not.toBe(first.plan.id);
  });
});
