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
  "first-haul": "想动一动时，一起接一场 30 秒补给雨。",
  "shared-supply": "背包里的补给，想起它时再分享就好。",
  "saved-memory": "想留住的动态，收藏进共同记忆即可。",
  "trusted-pair": "按自己的节奏相处，同行值会慢慢到 25。"
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
    title: completedCount === milestones.length ? "第一段航线画好了" : "慢慢画一条航线",
    description:
      completedCount === milestones.length
        ? "补给、记忆和默契都有了。想出发时，再一起走。"
        : "没有截止日期。一起生活过的痕迹，会慢慢连成航线。",
    completedCount,
    totalCount: milestones.length,
    completed: completedCount === milestones.length,
    nextPrompt: nextMilestone
      ? nextPrompts[nextMilestone.id]
      : "航线会留在这里。继续生活就好，不用为它打卡。",
    milestones
  };
}
