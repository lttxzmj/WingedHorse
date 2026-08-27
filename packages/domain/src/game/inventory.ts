import { ITEM_CATALOG, type ItemEffect, type ItemId } from "./items.js";

export type Inventory = Partial<Record<ItemId, number>>;

export interface PetVitals {
  energy: number;
  warmth: number;
  joy: number;
}

export const INITIAL_PET_VITALS: PetVitals = { energy: 68, warmth: 72, joy: 64 };

function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function addItem(inventory: Inventory, itemId: ItemId, quantity = 1): Inventory {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("INVALID_ITEM_QUANTITY");
  return { ...inventory, [itemId]: (inventory[itemId] ?? 0) + quantity };
}

export function applyEffect(vitals: PetVitals, effect: ItemEffect): PetVitals {
  return {
    energy: clampMeter(vitals.energy + (effect.energy ?? 0)),
    warmth: clampMeter(vitals.warmth + (effect.warmth ?? 0)),
    joy: clampMeter(vitals.joy + (effect.joy ?? 0))
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
