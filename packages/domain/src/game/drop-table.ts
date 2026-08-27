import type { ItemId } from "./items.js";

export interface DropDefinition {
  itemId: ItemId;
  weight: number;
  points: number;
  speed: number;
}

export const DROP_TABLE: readonly DropDefinition[] = [
  { itemId: "iced-americano", weight: 24, points: 10, speed: 1 },
  { itemId: "steering-wheel-charm", weight: 20, points: 12, speed: 1.02 },
  { itemId: "screaming-chicken", weight: 20, points: 12, speed: 1.05 },
  { itemId: "compass", weight: 18, points: 14, speed: 1.08 },
  { itemId: "nap-mask", weight: 7, points: 20, speed: 1.12 },
  { itemId: "main-quest-note", weight: 5, points: 22, speed: 1.15 },
  { itemId: "mad-note", weight: 3, points: 24, speed: 1.18 },
  { itemId: "off-work-barrier", weight: 1, points: 32, speed: 1.22 },
  { itemId: "refusal-script", weight: 1, points: 34, speed: 1.24 },
  { itemId: "emotion-valve", weight: 0.5, points: 38, speed: 1.26 },
  { itemId: "mentor-card", weight: 0.5, points: 40, speed: 1.28 }
] as const;

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectDrop(
  random: () => number,
  table: readonly DropDefinition[] = DROP_TABLE
): DropDefinition {
  const total = table.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) throw new Error("INVALID_DROP_TABLE");
  let cursor = random() * total;
  for (const item of table) {
    cursor -= item.weight;
    if (cursor < 0) return item;
  }
  return table[table.length - 1]!;
}
