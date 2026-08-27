import type { ItemId } from "./items.js";

export interface DropDefinition {
  itemId: ItemId;
  weight: number;
  points: number;
  speed: number;
}

export const DROP_TABLE: readonly DropDefinition[] = [
  { itemId: "sun-berry", weight: 42, points: 10, speed: 1 },
  { itemId: "cloud-milk", weight: 24, points: 15, speed: 1.05 },
  { itemId: "star-thread", weight: 20, points: 18, speed: 1.15 },
  { itemId: "warm-blanket", weight: 9, points: 28, speed: 1.25 },
  { itemId: "mystery-box", weight: 5, points: 40, speed: 1.35 }
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
