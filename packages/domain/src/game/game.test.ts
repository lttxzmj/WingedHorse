import { describe, expect, it } from "vitest";
import { createSeededRandom, selectDrop } from "./drop-table.js";
import {
  addItem,
  consumeItem,
  createPetVitalsFromAssessment,
  grantItems,
  INITIAL_PET_VITALS,
  recommendCareItem
} from "./inventory.js";

describe("inventory transactions", () => {
  it("adds, consumes and clamps pet meters", () => {
    const inventory = addItem({}, "nap-mask", 2);
    const result = consumeItem(inventory, { ...INITIAL_PET_VITALS, energy: 96 }, "nap-mask");
    expect(result.inventory["nap-mask"]).toBe(1);
    expect(result.vitals.energy).toBe(100);
  });

  it("rejects invalid item operations", () => {
    expect(() => addItem({}, "iced-americano", 0)).toThrow("INVALID_ITEM_QUANTITY");
    expect(() => consumeItem({}, INITIAL_PET_VITALS, "iced-americano")).toThrow("ITEM_NOT_OWNED");
    expect(() =>
      consumeItem({ "sponsored-tent-skin": 1 }, INITIAL_PET_VITALS, "sponsored-tent-skin")
    ).toThrow("ITEM_NOT_CONSUMABLE");
  });

  it("initializes the four game dimensions from the latest assessment without changing its result", () => {
    const source = { energy: 12.4, engine: 45.5, chaos: 103, direction: -2 };
    expect(createPetVitalsFromAssessment(source)).toEqual({
      energy: 12,
      engine: 46,
      chaos: 100,
      direction: 0
    });
    expect(source).toEqual({ energy: 12.4, engine: 45.5, chaos: 103, direction: -2 });
  });

  it("enforces the configured item stack limit", () => {
    expect(() => addItem({ "iced-americano": 99 }, "iced-americano", 1)).toThrow(
      "ITEM_STACK_LIMIT"
    );
  });

  it("grants a game reward bundle atomically and caps stacks", () => {
    expect(grantItems({ "iced-americano": 98 }, { "iced-americano": 4, compass: 1 })).toEqual({
      "iced-americano": 99,
      compass: 1
    });
    expect(() => grantItems({}, { compass: -1 })).toThrow("INVALID_ITEM_QUANTITY");
  });

  it("recommends the owned common item that best matches the current need", () => {
    const inventory = {
      "iced-americano": 2,
      "nap-mask": 1,
      "steering-wheel-charm": 1,
      "screaming-chicken": 1,
      "emotion-valve": 1
    } as const;
    expect(
      recommendCareItem(inventory, { energy: 80, engine: 70, chaos: 92, direction: 70 })
    ).toBe("screaming-chicken");
    expect(
      recommendCareItem(inventory, { energy: 12, engine: 70, chaos: 10, direction: 70 })
    ).toBe("nap-mask");
    expect(recommendCareItem({ "emotion-valve": 1 }, INITIAL_PET_VITALS)).toBeNull();
    expect(recommendCareItem({}, INITIAL_PET_VITALS)).toBeNull();
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
