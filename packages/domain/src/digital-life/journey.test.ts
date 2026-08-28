import { describe, expect, it } from "vitest";
import { createLifeEvent } from "./life.js";
import { deriveJourneyGoal } from "./journey.js";

const arrival = createLifeEvent({
  eventKey: "arrival",
  kind: "arrival",
  occurredAt: "2026-08-28T08:00:00.000Z",
  typeId: "chosen"
});

describe("deriveJourneyGoal", () => {
  it("starts gently without inventing progress", () => {
    const goal = deriveJourneyGoal({ events: [arrival], gamesPlayed: 0, relationshipXp: 0 });

    expect(goal.completedCount).toBe(0);
    expect(goal.nextPrompt).toContain("30 秒补给雨");
    expect(goal.milestones.every((milestone) => !milestone.completed)).toBe(true);
  });

  it("derives unordered milestones from existing life facts", () => {
    const gift = createLifeEvent({
      eventKey: "gift",
      kind: "gift",
      occurredAt: "2026-08-28T09:00:00.000Z",
      typeId: "chosen",
      itemId: "iced-americano"
    });
    const savedArrival = { ...arrival, saved: true };
    const goal = deriveJourneyGoal({
      events: [gift, savedArrival],
      gamesPlayed: 0,
      relationshipXp: 25
    });

    expect(goal.completedCount).toBe(3);
    expect(goal.milestones.find((item) => item.id === "first-haul")?.completed).toBe(false);
    expect(goal.nextPrompt).toContain("30 秒补给雨");
  });

  it("recognizes a game event and completes the first journey without a streak", () => {
    const game = createLifeEvent({
      eventKey: "game",
      kind: "game-haul",
      occurredAt: "2026-08-28T09:00:00.000Z",
      typeId: "chosen"
    });
    const gift = createLifeEvent({
      eventKey: "gift",
      kind: "gift",
      occurredAt: "2026-08-28T10:00:00.000Z",
      typeId: "chosen",
      itemId: "iced-americano"
    });
    const goal = deriveJourneyGoal({
      events: [{ ...gift, saved: true }, game],
      gamesPlayed: 0,
      relationshipXp: 25
    });

    expect(goal.completed).toBe(true);
    expect(goal.completedCount).toBe(goal.totalCount);
    expect(goal.nextPrompt).toContain("不需要");
  });
});
