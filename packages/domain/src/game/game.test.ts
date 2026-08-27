import { describe, expect, it } from "vitest";
import { createSeededRandom, selectDrop } from "./drop-table.js";
import { addItem, consumeItem, INITIAL_PET_VITALS } from "./inventory.js";

describe("inventory transactions", () => {
  it("adds, consumes and clamps pet meters", () => {
    const inventory = addItem({}, "warm-blanket", 2);
    const result = consumeItem(inventory, { ...INITIAL_PET_VITALS, warmth: 96 }, "warm-blanket");
    expect(result.inventory["warm-blanket"]).toBe(1);
    expect(result.vitals.warmth).toBe(100);
  });

  it("rejects invalid item operations", () => {
    expect(() => addItem({}, "sun-berry", 0)).toThrow("INVALID_ITEM_QUANTITY");
    expect(() => consumeItem({}, INITIAL_PET_VITALS, "sun-berry")).toThrow("ITEM_NOT_OWNED");
    expect(() => consumeItem({ "star-thread": 1 }, INITIAL_PET_VITALS, "star-thread")).toThrow("ITEM_NOT_CONSUMABLE");
  });
});

describe("drop selection", () => {
  it("is deterministic for a seed and only returns catalogued drops", () => {
    const first = createSeededRandom(20260827);
    const second = createSeededRandom(20260827);
    const a = Array.from({ length: 100 }, () => selectDrop(first).itemId);
    const b = Array.from({ length: 100 }, () => selectDrop(second).itemId);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBeGreaterThan(2);
  });
});
