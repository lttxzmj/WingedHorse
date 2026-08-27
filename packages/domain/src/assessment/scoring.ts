import {
  DIMENSIONS,
  type AssessmentAnswers,
  type AssessmentResult,
  type Dimension,
  type DimensionScores,
  type HorseTypeId,
  type QuestionSet,
  type ReachableRanges
} from "./types.js";

export type AssessmentErrorCode = "MISSING_ANSWERS" | "UNKNOWN_QUESTION" | "INVALID_OPTION";

export class AssessmentValidationError extends Error {
  readonly code: AssessmentErrorCode;

  constructor(code: AssessmentErrorCode, message: string) {
    super(message);
    this.name = "AssessmentValidationError";
    this.code = code;
  }
}

const TYPE_THRESHOLD = 50;
const HIDDEN_TRAIT_MIN = 45;
const HIDDEN_TRAIT_MAX = 55;
const TYPING_DIMENSIONS: readonly Dimension[] = ["energy", "engine", "chaos"];

function effectOf(option: { effects: Partial<DimensionScores> }, dimension: Dimension): number {
  return option.effects[dimension] ?? 0;
}

/**
 * 从题目数据自动推导每个维度的可达区间（最低/最高可达原始分）。
 * 这是区间唯一来源，禁止在别处维护手写理论区间。
 */
export function computeReachableRanges(questionSet: QuestionSet): ReachableRanges {
  const ranges = {} as ReachableRanges;
  for (const dimension of DIMENSIONS) {
    let min = 0;
    let max = 0;
    for (const question of questionSet.questions) {
      if (!question.scored) continue;
      let questionMin = 0;
      let questionMax = 0;
      for (const option of question.options) {
        const value = effectOf(option, dimension);
        if (value < questionMin) questionMin = value;
        if (value > questionMax) questionMax = value;
      }
      min += questionMin;
      max += questionMax;
    }
    ranges[dimension] = { min, max };
  }
  return ranges;
}

/** 构造一份完整合法答案，使指定维度达到其可达最低/最高原始分（用于测试与边界验证）。 */
export function getExtremeAnswers(
  questionSet: QuestionSet,
  dimension: Dimension,
  extreme: "min" | "max"
): AssessmentAnswers {
  const answers: Record<string, string> = {};
  for (const question of questionSet.questions) {
    const first = question.options[0];
    if (!question.scored) {
      if (first) answers[question.id] = first.id;
      continue;
    }
    let best = first;
    let bestValue = best ? effectOf(best, dimension) : 0;
    for (const option of question.options) {
      const value = effectOf(option, dimension);
      if (extreme === "min" ? value < bestValue : value > bestValue) {
        best = option;
        bestValue = value;
      }
    }
    if (best) answers[question.id] = best.id;
  }
  return answers;
}

function computeRawScores(questionSet: QuestionSet, answers: AssessmentAnswers): DimensionScores {
  const raw: DimensionScores = { energy: 0, engine: 0, chaos: 0, direction: 0 };
  for (const question of questionSet.questions) {
    if (!question.scored) continue;
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) continue;
    for (const dimension of DIMENSIONS) {
      raw[dimension] += effectOf(option, dimension);
    }
  }
  return raw;
}

function normalizeScores(raw: DimensionScores, ranges: ReachableRanges): DimensionScores {
  const normalized = {} as DimensionScores;
  for (const dimension of DIMENSIONS) {
    const { min, max } = ranges[dimension];
    const value = max === min ? 50 : ((raw[dimension] - min) / (max - min)) * 100;
    normalized[dimension] = Math.min(100, Math.max(0, value));
  }
  return normalized;
}

/** 三个分型维度按 50 分阈值组合出 8 种类型，50 为闭区间边界。 */
export function classifyScores(scores: DimensionScores): HorseTypeId {
  const energy = scores.energy >= TYPE_THRESHOLD ? "high" : "low";
  const engine = scores.engine >= TYPE_THRESHOLD ? "high" : "low";
  const chaos = scores.chaos >= TYPE_THRESHOLD ? "high" : "low";

  if (energy === "high" && engine === "high" && chaos === "low") return "chosen";
  if (energy === "high" && engine === "high" && chaos === "high") return "perpetual";
  if (energy === "high" && engine === "low" && chaos === "low") return "veteran";
  if (energy === "high" && engine === "low" && chaos === "high") return "explosive";
  if (energy === "low" && engine === "high" && chaos === "low") return "saving";
  if (energy === "low" && engine === "high" && chaos === "high") return "overthinker";
  if (energy === "low" && engine === "low" && chaos === "low") return "tired";
  return "mad-literature";
}

function collectEdgeDimensions(scores: DimensionScores): Dimension[] {
  return TYPING_DIMENSIONS.filter((dimension) => {
    const value = scores[dimension];
    return value >= HIDDEN_TRAIT_MIN && value <= HIDDEN_TRAIT_MAX;
  });
}

function collectEasterEggs(questionSet: QuestionSet, answers: AssessmentAnswers): string[] {
  const eggs: string[] = [];
  for (const question of questionSet.questions) {
    if (question.scored) continue;
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (option?.easterEgg) eggs.push(option.easterEgg);
  }
  return eggs;
}

function validate(questionSet: QuestionSet, answers: AssessmentAnswers): AssessmentValidationError | null {
  const knownIds = new Set(questionSet.questions.map((question) => question.id));
  const unknown = Object.keys(answers).filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    return new AssessmentValidationError("UNKNOWN_QUESTION", `包含未知题目：${unknown.join(", ")}`);
  }

  const missing = questionSet.questions
    .filter((question) => question.scored && answers[question.id] == null)
    .map((question) => question.id);
  if (missing.length > 0) {
    return new AssessmentValidationError("MISSING_ANSWERS", `缺少答案：${missing.join(", ")}`);
  }

  for (const question of questionSet.questions) {
    const optionId = answers[question.id];
    if (optionId == null) continue;
    if (!question.options.some((option) => option.id === optionId)) {
      return new AssessmentValidationError("INVALID_OPTION", `题目 ${question.id} 的选项 ${optionId} 不存在`);
    }
  }

  return null;
}

/**
 * 纯函数：输入题库与答案，输出完整计分结果。
 * 不读取时间、网络或数据库；非法答案抛 AssessmentValidationError。
 */
export function scoreAssessment(questionSet: QuestionSet, answers: AssessmentAnswers): AssessmentResult {
  const error = validate(questionSet, answers);
  if (error) throw error;

  const ranges = computeReachableRanges(questionSet);
  const rawScores = computeRawScores(questionSet, answers);
  const normalizedScores = normalizeScores(rawScores, ranges);

  return {
    questionSetId: questionSet.id,
    questionSetVersion: questionSet.version,
    rawScores,
    normalizedScores,
    typeId: classifyScores(normalizedScores),
    edgeDimensions: collectEdgeDimensions(normalizedScores),
    easterEggs: collectEasterEggs(questionSet, answers)
  };
}
