/**
 * 心情/状态 → 灯光表现 的领域规则（纯函数，可测试）。
 * 供服务端下发 MQTT effect，也供 ESP32 固件镜像同样的映射。
 * 表现克制：不闪烁、不吓人，符合 UI_STYLE_GUIDE 的情绪红线。
 */

import type { ExpressionTag } from "./expression.js";

export type MoodId = "good" | "flat" | "tired" | "anxious" | "sad";

export type LightAnimation = "off" | "steady" | "breathe" | "pulse" | "flow" | "rainbow";

export interface LightEffect {
  /** #RRGGBB */
  color: string;
  /** 0–100 */
  brightness: number;
  animation: LightAnimation;
}

/** 品牌与状态色（与 UI token 对齐） */
export const LIGHT_COLORS = {
  brand: "#FFD057",
  warm: "#FFB25A",
  cool: "#4D8FCB",
  soft: "#FF9E7A",
  idle: "#FFF3D6",
  rest: "#FFF6E8",
  reward: "#FFD057",
  offline: "#000000"
} as const;

/** 心情 → 灯效（主体映射） */
export const MOOD_LIGHT: Record<MoodId, LightEffect> = {
  good: { color: LIGHT_COLORS.brand, brightness: 90, animation: "breathe" },
  flat: { color: LIGHT_COLORS.idle, brightness: 45, animation: "steady" },
  tired: { color: LIGHT_COLORS.warm, brightness: 55, animation: "breathe" },
  anxious: { color: LIGHT_COLORS.cool, brightness: 55, animation: "flow" },
  sad: { color: LIGHT_COLORS.soft, brightness: 50, animation: "breathe" }
};

export function moodToLight(mood: MoodId): LightEffect {
  return MOOD_LIGHT[mood];
}

/** 休养模式：极暗暖白、超慢呼吸，不打扰 */
export function restModeLight(): LightEffect {
  return { color: LIGHT_COLORS.rest, brightness: 20, animation: "breathe" };
}

/** 掉落/任务完成：一次金色脉冲（庆祝，最多一次） */
export function rewardFlash(): LightEffect {
  return { color: LIGHT_COLORS.reward, brightness: 100, animation: "pulse" };
}

/** 端侧表情 → 1 秒内的小反馈（不持续抢戏） */
export function expressionToFlash(expression: ExpressionTag): LightEffect {
  switch (expression) {
    case "smile": return { color: LIGHT_COLORS.brand, brightness: 80, animation: "pulse" };
    case "tired": return { color: LIGHT_COLORS.warm, brightness: 35, animation: "steady" };
    case "surprise": return { color: "#FFFFFF", brightness: 70, animation: "pulse" };
    case "frown": return { color: LIGHT_COLORS.cool, brightness: 40, animation: "steady" };
    case "neutral": return { color: LIGHT_COLORS.idle, brightness: 40, animation: "steady" };
  }
}

/** 设备在线/离线状态点 */
export function statusLight(online: boolean): LightEffect {
  return online
    ? { color: LIGHT_COLORS.idle, brightness: 20, animation: "steady" }
    : { color: LIGHT_COLORS.offline, brightness: 0, animation: "off" };
}

/** 校验颜色为 #RRGGBB（外部输入边界） */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
