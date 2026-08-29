export type CompanionGrowthStageId = "arrival" | "familiar" | "trusted" | "wingmate";

export interface CompanionGrowthStage {
  id: CompanionGrowthStageId;
  name: string;
  relationshipLabel: string;
  description: string;
  unlockHint: string;
  minimumXp: number;
  nextThreshold: number | null;
  progressPercent: number;
}

const stages = [
  {
    id: "arrival",
    name: "初遇",
    relationshipLabel: "刚刚同行",
    description: "它正在记住你的节奏，不需要急着表现亲密。",
    unlockHint: "再一起生活几次，它会更自然地回应你。",
    minimumXp: 0,
    nextThreshold: 10
  },
  {
    id: "familiar",
    name: "熟悉",
    relationshipLabel: "熟悉伙伴",
    description: "你们已经有了一些共同经历，它开始主动留下生活片段。",
    unlockHint: "继续留下共同记忆，慢慢成为默契搭子。",
    minimumXp: 10,
    nextThreshold: 25
  },
  {
    id: "trusted",
    name: "默契",
    relationshipLabel: "默契搭子",
    description: "它知道你不需要被催，也更愿意分享自己的小世界。",
    unlockHint: "关系会继续生长，但不会要求连续打卡。",
    minimumXp: 25,
    nextThreshold: 60
  },
  {
    id: "wingmate",
    name: "并肩",
    relationshipLabel: "并肩老友",
    description: "你们已经形成稳定的相处方式，离开一阵也不会失去关系。",
    unlockHint: "之后的变化来自新的共同经历，而不是更高的数字。",
    minimumXp: 60,
    nextThreshold: null
  }
] as const;

export function deriveCompanionGrowth(relationshipXp: number): CompanionGrowthStage {
  const safeXp = Math.max(0, Math.min(999, Math.floor(relationshipXp)));
  const stage = [...stages].reverse().find((candidate) => safeXp >= candidate.minimumXp)!;
  const progressPercent = stage.nextThreshold
    ? Math.round(((safeXp - stage.minimumXp) / (stage.nextThreshold - stage.minimumXp)) * 100)
    : 100;

  return { ...stage, progressPercent };
}
