import type { LifeEvent } from "./life.js";

export type JourneyMilestoneId = "first-haul" | "shared-supply" | "saved-memory" | "trusted-pair";

export interface JourneyMilestone {
  id: JourneyMilestoneId;
  label: string;
  completed: boolean;
}

export interface JourneyGoal {
  title: string;
  description: string;
  completedCount: number;
  totalCount: number;
  completed: boolean;
  nextPrompt: string;
  milestones: JourneyMilestone[];
}

export interface JourneyGoalInput {
  events: readonly LifeEvent[];
  gamesPlayed: number;
  relationshipXp: number;
}

const milestoneCopy: Array<Pick<JourneyMilestone, "id" | "label">> = [
  { id: "first-haul", label: "带回第一份补给" },
  { id: "shared-supply", label: "一起用过一份补给" },
  { id: "saved-memory", label: "留住一段共同记忆" },
  { id: "trusted-pair", label: "成为默契搭子" }
];

const nextPrompts: Record<JourneyMilestoneId, string> = {
  "first-haul": "哪天想动一动，就一起接一场 30 秒补给雨。",
  "shared-supply": "背包里的补给不用急着用，想起它时再分享。",
  "saved-memory": "遇到想留住的动态，可以存进你们的共同记忆。",
  "trusted-pair": "继续按自己的节奏相处，同行值会自然长到 25。"
};

export function deriveJourneyGoal(input: JourneyGoalInput): JourneyGoal {
  const completedById: Record<JourneyMilestoneId, boolean> = {
    "first-haul": input.gamesPlayed > 0 || input.events.some((event) => event.kind === "game-haul"),
    "shared-supply": input.events.some((event) => event.kind === "gift"),
    "saved-memory": input.events.some((event) => event.saved),
    "trusted-pair": input.relationshipXp >= 25
  };
  const milestones = milestoneCopy.map((milestone) => ({
    ...milestone,
    completed: completedById[milestone.id]
  }));
  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  const nextMilestone = milestones.find((milestone) => !milestone.completed);

  return {
    title: completedCount === milestones.length ? "第一段航线，已经画好" : "一起画一条远行航线",
    description:
      completedCount === milestones.length
        ? "你们已经有了补给、共同记忆和足够的默契。真正想出发时，再一起走。"
        : "不用赶路，也没有截止日期。共同生活过的痕迹，会慢慢变成航线。",
    completedCount,
    totalCount: milestones.length,
    completed: completedCount === milestones.length,
    nextPrompt: nextMilestone
      ? nextPrompts[nextMilestone.id]
      : "航线会留在这里。继续生活，不需要为了维持它而打卡。",
    milestones
  };
}
