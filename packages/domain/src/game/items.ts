export type ItemId = "sun-berry" | "cloud-milk" | "star-thread" | "warm-blanket" | "mystery-box";
export type ItemKind = "food" | "comfort" | "material" | "mystery";

export interface ItemEffect {
  energy?: number;
  warmth?: number;
  joy?: number;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  emoji: string;
  kind: ItemKind;
  consumable: boolean;
  rarity: "common" | "uncommon" | "rare";
  effect: ItemEffect;
}

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  "sun-berry": {
    id: "sun-berry",
    name: "太阳莓",
    description: "甜甜的，补回一点力气。",
    emoji: "🍓",
    kind: "food",
    consumable: true,
    rarity: "common",
    effect: { energy: 12, joy: 3 }
  },
  "cloud-milk": {
    id: "cloud-milk",
    name: "云朵奶",
    description: "喝完像被软云接住。",
    emoji: "🥛",
    kind: "food",
    consumable: true,
    rarity: "uncommon",
    effect: { warmth: 10, energy: 5 }
  },
  "star-thread": {
    id: "star-thread",
    name: "星星线",
    description: "以后可以用来制作小装饰。",
    emoji: "🧵",
    kind: "material",
    consumable: false,
    rarity: "uncommon",
    effect: {}
  },
  "warm-blanket": {
    id: "warm-blanket",
    name: "暖暖毯",
    description: "盖一会儿，不必马上振作。",
    emoji: "🧣",
    kind: "comfort",
    consumable: true,
    rarity: "rare",
    effect: { warmth: 18, joy: 5 }
  },
  "mystery-box": {
    id: "mystery-box",
    name: "未知小箱",
    description: "打开时，会变成一份随机礼物。",
    emoji: "🎁",
    kind: "mystery",
    consumable: true,
    rarity: "rare",
    effect: { joy: 12 }
  }
};

export const ITEM_IDS = Object.keys(ITEM_CATALOG) as ItemId[];
