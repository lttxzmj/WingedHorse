import { describe, expect, it } from "vitest";
import {
  gameSessionStartSchema,
  gameSettlementSchema,
  inventorySchema,
  playerStateSchema
} from "./index.js";

describe("player contracts", () => {
  it("accepts a sparse inventory instead of requiring every catalog item", () => {
    expect(inventorySchema.parse({ "iced-americano": 2 })).toEqual({ "iced-americano": 2 });
    expect(
      playerStateSchema.parse({
        inventory: {},
        vitals: { energy: 50, engine: 50, chaos: 50, direction: 50 },
        gamesPlayed: 0,
        relationshipXp: 0,
        revision: 0
      }).inventory
    ).toEqual({});
  });

  it("rejects unknown items and oversized game settlements", () => {
    expect(inventorySchema.safeParse({ mystery: 1 }).success).toBe(false);
    expect(
      gameSettlementSchema.safeParse({ score: 10, caught: { "iced-americano": 51 } }).success
    ).toBe(false);
  });

  it("rejects client-provided bootstrap player state", () => {
    expect(
      gameSessionStartSchema.safeParse({
        typeId: "chosen",
        bootstrap: {
          inventory: { "mentor-card": 99 },
          vitals: { energy: 100, engine: 100, chaos: 0, direction: 100 },
          gamesPlayed: 999,
          relationshipXp: 99999
        }
      }).success
    ).toBe(false);
  });
});
