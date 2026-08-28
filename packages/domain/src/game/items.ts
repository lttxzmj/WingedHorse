export type ItemId =
  | "iced-americano"
  | "nap-mask"
  | "off-work-barrier"
  | "steering-wheel-charm"
  | "main-quest-note"
  | "refusal-script"
  | "screaming-chicken"
  | "mad-note"
  | "emotion-valve"
  | "compass"
  | "mentor-card"
  | "sponsored-tent-skin"
  | "sponsored-coffee-coupon";

export type ItemKind =
  | "energy-supply"
  | "engine-tool"
  | "pressure-release"
  | "navigation"
  | "decoration"
  | "sponsored-supply";

export interface ItemEffect {
  energy?: number;
  engine?: number;
  chaos?: number;
  direction?: number;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  icon: string;
  kind: ItemKind;
  consumable: boolean;
  rarity: "common" | "uncommon" | "rare";
  effect: ItemEffect;
  durationHours: number | null;
  cooldownHours: number | null;
  sponsored: boolean;
  stackLimit: number;
}

function item(
  id: ItemId,
  name: string,
  description: string,
  icon: string,
  kind: ItemKind,
  rarity: ItemDefinition["rarity"],
  effect: ItemEffect,
  durationHours: number | null,
  cooldownHours: number | null,
  sponsored = false,
  consumable = true
): ItemDefinition {
  return {
    id,
    name,
    description,
    icon,
    kind,
    consumable,
    rarity,
    effect,
    durationHours,
    cooldownHours,
    sponsored,
    stackLimit: 99
  };
}

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  "iced-americano": item(
    "iced-americano",
    "冰美式补给",
    "咖啡因到账，牛马短暂复活。",
    "杯",
    "energy-supply",
    "common",
    { energy: 8 },
    24,
    20
  ),
  "nap-mask": item(
    "nap-mask",
    "午睡眼罩",
    "眼睛一闭，KPI 暂时不存在。",
    "眠",
    "energy-supply",
    "uncommon",
    { energy: 12 },
    24,
    24
  ),
  "off-work-barrier": item(
    "off-work-barrier",
    "下班结界卡",
    "到点了，谁都别想把牛马留在工位。",
    "界",
    "energy-supply",
    "rare",
    { energy: 10, engine: 4 },
    24,
    48
  ),
  "steering-wheel-charm": item(
    "steering-wheel-charm",
    "方向盘挂件",
    "方向盘先拿回来一点点。",
    "舵",
    "engine-tool",
    "common",
    { engine: 8 },
    24,
    20
  ),
  "main-quest-note": item(
    "main-quest-note",
    "主线任务便签",
    "今天只推进一件真正重要的事。",
    "签",
    "engine-tool",
    "uncommon",
    { engine: 6, direction: 4 },
    24,
    20
  ),
  "refusal-script": item(
    "refusal-script",
    "拒绝话术卡",
    "“这个我接不了”也可以说得很有礼貌。",
    "拒",
    "engine-tool",
    "rare",
    { engine: 10 },
    48,
    72
  ),
  "screaming-chicken": item(
    "screaming-chicken",
    "尖叫鸡",
    "捏一下，把工位里的气压放掉。",
    "鸣",
    "pressure-release",
    "common",
    { chaos: -8 },
    24,
    20
  ),
  "mad-note": item(
    "mad-note",
    "发疯文学便签",
    "写完三行，体面回到人间。",
    "写",
    "pressure-release",
    "uncommon",
    { energy: 3, chaos: -6 },
    24,
    20
  ),
  "emotion-valve": item(
    "emotion-valve",
    "情绪排气阀",
    "高压锅也需要定期放气。",
    "阀",
    "pressure-release",
    "rare",
    { chaos: -12 },
    48,
    72
  ),
  compass: item(
    "compass",
    "指南针",
    "路不一定近，但至少不是原地打转。",
    "向",
    "navigation",
    "common",
    { direction: 8 },
    24,
    20
  ),
  "mentor-card": item(
    "mentor-card",
    "伯乐名片",
    "等不到伯乐，先存一张自己的地图。",
    "图",
    "navigation",
    "rare",
    { direction: 12 },
    48,
    72
  ),
  "sponsored-tent-skin": item(
    "sponsored-tent-skin",
    "蓝盒子帐篷布标",
    "草原支持伙伴留下的限定布标。",
    "篷",
    "decoration",
    "rare",
    {},
    null,
    null,
    true,
    false
  ),
  "sponsored-coffee-coupon": item(
    "sponsored-coffee-coupon",
    "蓝盒子睡眠护理枕",
    "品牌合作虚拟体验物品，给飞马一段舒服的休息时间。",
    "券",
    "sponsored-supply",
    "uncommon",
    { energy: 5 },
    24,
    null,
    true
  )
};

export const ITEM_IDS = Object.keys(ITEM_CATALOG) as ItemId[];
