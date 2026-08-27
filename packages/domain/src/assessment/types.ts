export const DIMENSIONS = ["energy", "engine", "chaos", "direction"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type DimensionScores = Record<Dimension, number>;

export interface QuestionOption {
  id: string;
  label: string;
  effects: Partial<DimensionScores>;
  easterEgg?: string;
}
export interface AssessmentQuestion {
  id: string;
  scene: string;
  prompt: string;
  scored: boolean;
  options: readonly QuestionOption[];
}
export interface QuestionSet {
  id: string;
  version: string;
  title: string;
  estimatedMinutes: number;
  questions: readonly AssessmentQuestion[];
}
export type AssessmentAnswers = Readonly<Record<string, string>>;
export type HorseTypeId =
  | "chosen"
  | "perpetual"
  | "veteran"
  | "explosive"
  | "saving"
  | "overthinker"
  | "tired"
  | "mad-literature";
export interface ReachableRange {
  min: number;
  max: number;
}
export type ReachableRanges = Record<Dimension, ReachableRange>;
export interface AssessmentResult {
  questionSetId: string;
  questionSetVersion: string;
  rawScores: DimensionScores;
  normalizedScores: DimensionScores;
  typeId: HorseTypeId;
  edgeDimensions: Dimension[];
  easterEggs: string[];
  bloodline: {
    purity: number;
    hidden: Array<{ typeId: HorseTypeId; percentage: number }>;
  };
  directionHint: "needs-direction" | "clear-direction";
}
