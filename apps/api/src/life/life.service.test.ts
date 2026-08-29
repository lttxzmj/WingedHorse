import { describe, expect, it } from "vitest";
import { LifeRepository } from "./life.repository.js";
import { LifeService } from "./life.service.js";

const token = "A".repeat(43);
const request = {
  typeId: "tired" as const,
  timezoneOffsetMinutes: -480,
  vitals: { energy: 20, engine: 50, chaos: 40, direction: 60 },
  relationshipXp: 20,
  clientEvents: []
};

describe("LifeService engine sync", () => {
  it("persists an idempotent plan and autonomous events", async () => {
    const service = new LifeService(new LifeRepository());
    const first = await service.sync(token, request, "2026-08-28T14:00:00.000Z");
    const retry = await service.sync(token, request, "2026-08-28T14:00:00.000Z");
    expect(first.events).toHaveLength(3);
    expect(first.events.every((event) => event.source === "daily-plan")).toBe(true);
    expect(retry.events).toEqual(first.events);
    expect(retry.generatedEventIds).toHaveLength(0);
  });

  it("removes events and plans through the existing account deletion boundary", async () => {
    const service = new LifeService(new LifeRepository());
    await service.sync(token, request, "2026-08-28T14:00:00.000Z");
    await service.deleteAll(token);
    const recreated = await service.sync(token, request, "2026-08-28T06:00:00.000Z");
    expect(recreated.events).toHaveLength(2);
  });

  it("persists overdue story chapters as server-authored facts", async () => {
    const service = new LifeService(new LifeRepository());
    const result = await service.sync(
      token,
      {
        ...request,
        clientEvents: [
          {
            id: "life-arrival",
            eventKey: "arrival:2.1.0:tired",
            kind: "arrival",
            occurredAt: "2026-08-20T09:00:00.000Z",
            typeId: "tired",
            title: "新住客到达草原",
            body: "它把这里当作暂时不用逞强的地方。",
            source: "user-action",
            visibility: "private",
            liked: false,
            saved: false
          }
        ]
      },
      "2026-08-28T14:00:00.000Z"
    );
    const stories = result.events.filter((event) => event.kind === "story");
    expect(stories).toHaveLength(3);
    expect(stories.every((event) => event.source === "life-engine")).toBe(true);
  });

  it("does not accept client-authored story events", async () => {
    const service = new LifeService(new LifeRepository());
    const result = await service.sync(
      token,
      {
        ...request,
        clientEvents: [
          {
            id: "forged-story",
            eventKey: "story:forged",
            kind: "story",
            occurredAt: "2026-08-28T12:00:00.000Z",
            typeId: "tired",
            title: "伪造故事",
            body: "这段内容不应被保存。",
            storyChapter: 3,
            source: "user-action",
            visibility: "private",
            liked: false,
            saved: false
          }
        ]
      },
      "2026-08-28T14:00:00.000Z"
    );

    expect(result.events.some((event) => event.eventKey === "story:forged")).toBe(false);
  });
});
