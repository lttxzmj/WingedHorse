import type { DimensionScores } from "../assessment/types.js";
import { ITEM_CATALOG, type ItemEffect, type ItemId } from "./items.js";

export type Inventory = Partial<Record<ItemId, number>>;

export interface PetVitals {
  energy: number;
  engine: number;
  chaos: number;
  direction: number;
}

export const INITIAL_PET_VITALS: PetVitals = { energy: 50, engine: 50, chaos: 50, direction: 50 };

export function createPetVitalsFromAssessment(scores: DimensionScores): PetVitals {
  return {
    energy: clampMeter(scores.energy),
    engine: clampMeter(scores.engine),
    chaos: clampMeter(scores.chaos),
    direction: clampMeter(scores.direction)
  };
}

function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function addItem(inventory: Inventory, itemId: ItemId, quantity = 1): Inventory {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("INVALID_ITEM_QUANTITY");
  const next = (inventory[itemId] ?? 0) + quantity;
  if (next > ITEM_CATALOG[itemId].stackLimit) throw new Error("ITEM_STACK_LIMIT");
  return { ...inventory, [itemId]: next };
}

export function grantItems(
  inventory: Inventory,
  rewards: Partial<Record<ItemId, number>>
): Inventory {
  return Object.entries(rewards).reduce<Inventory>((next, [id, quantity]) => {
    if (!quantity) return next;
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_ITEM_QUANTITY");
    const itemId = id as ItemId;
    const owned = next[itemId] ?? 0;
    return {
      ...next,
      [itemId]: Math.min(ITEM_CATALOG[itemId].stackLimit, owned + quantity)
    };
  }, inventory);
}

export function applyEffect(vitals: PetVitals, effect: ItemEffect): PetVitals {
  return {
    energy: clampMeter(vitals.energy + (effect.energy ?? 0)),
    engine: clampMeter(vitals.engine + (effect.engine ?? 0)),
    chaos: clampMeter(vitals.chaos + (effect.chaos ?? 0)),
    direction: clampMeter(vitals.direction + (effect.direction ?? 0))
  };
}

export function consumeItem(
  inventory: Inventory,
  vitals: PetVitals,
  itemId: ItemId
): { inventory: Inventory; vitals: PetVitals } {
  const item = ITEM_CATALOG[itemId];
  if (!item.consumable) throw new Error("ITEM_NOT_CONSUMABLE");
  const current = inventory[itemId] ?? 0;
  if (current < 1) throw new Error("ITEM_NOT_OWNED");
  const nextInventory = { ...inventory };
  if (current === 1) delete nextInventory[itemId];
  else nextInventory[itemId] = current - 1;
  return { inventory: nextInventory, vitals: applyEffect(vitals, item.effect) };
}

function careBenefit(vitals: PetVitals, itemId: ItemId): number {
  const effect = ITEM_CATALOG[itemId].effect;
  const restore = (change: number | undefined, current: number) =>
    change && change > 0 ? Math.min(change, 100 - current) * ((101 - current) / 100) : 0;
  const release =
    effect.chaos && effect.chaos < 0
      ? Math.min(-effect.chaos, vitals.chaos) * ((vitals.chaos + 1) / 100)
      : 0;
  return (
    restore(effect.energy, vitals.energy) +
    restore(effect.engine, vitals.engine) +
    restore(effect.direction, vitals.direction) +
    release
  );
}

export function recommendCareItem(inventory: Inventory, vitals: PetVitals): ItemId | null {
  const candidates = Object.keys(inventory).filter((id): id is ItemId => {
    const itemId = id as ItemId;
    const item = ITEM_CATALOG[itemId];
    return Boolean((inventory[itemId] ?? 0) > 0 && item.consumable && item.rarity !== "rare");
  });
  let best: ItemId | null = null;
  let bestBenefit = 0;
  for (const itemId of candidates) {
    const benefit = careBenefit(vitals, itemId);
    if (benefit > bestBenefit) {
      best = itemId;
      bestBenefit = benefit;
    }
  }
  return best;
}
