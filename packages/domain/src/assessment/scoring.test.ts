import { describe, expect, it } from "vitest";
import { currentQuestionSet } from "./question-set-v2-1.js";
import {
  AssessmentValidationError,
  classifyScores,
  computeReachableRanges,
  getExtremeAnswers,
  scoreAssessment
} from "./scoring.js";
import type { AssessmentAnswers, Dimension } from "./types.js";

const dimensions: Dimension[] = ["energy", "engine", "chaos", "direction"];
describe("assessment scoring", () => {
  it("derives the audited reachable ranges from question data", () => {
    expect(computeReachableRanges(currentQuestionSet)).toEqual({
      energy: { min: -16, max: 16 },
      engine: { min: -12, max: 14 },
      chaos: { min: -13, max: 23 },
      direction: { min: -9, max: 10 }
    });
  });
  it.each(dimensions)("maps the %s reachable extremes to 0 and 100", (dimension) => {
    expect(
      scoreAssessment(currentQuestionSet, getExtremeAnswers(currentQuestionSet, dimension, "min"))
        .normalizedScores[dimension]
    ).toBe(0);
    expect(
      scoreAssessment(currentQuestionSet, getExtremeAnswers(currentQuestionSet, dimension, "max"))
        .normalizedScores[dimension]
    ).toBe(100);
  });
  it("keeps deterministic sampled answer sets inside 0–100", () => {
    let state = 20260827;
    for (let sample = 0; sample < 1000; sample += 1) {
      const answers: Record<string, string> = {};
      for (const question of currentQuestionSet.questions) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const option = question.options[state % question.options.length];
        if (!option) throw new Error("Question must contain an option");
        answers[question.id] = option.id;
      }
      for (const score of Object.values(
        scoreAssessment(currentQuestionSet, answers).normalizedScores
      )) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
  it("uses inclusive 50-point type boundaries", () => {
    expect(classifyScores({ energy: 50, engine: 50, chaos: 49.99, direction: 0 })).toBe("chosen");
    expect(classifyScores({ energy: 50, engine: 50, chaos: 50, direction: 0 })).toBe("perpetual");
    expect(classifyScores({ energy: 49.99, engine: 49.99, chaos: 50, direction: 100 })).toBe(
      "mad-literature"
    );
  });
  it("does not score Q17 and only returns its optional easter egg", () => {
    const answers = getExtremeAnswers(currentQuestionSet, "energy", "min");
    const first = scoreAssessment(currentQuestionSet, { ...answers, q17: "a" });
    const second = scoreAssessment(currentQuestionSet, { ...answers, q17: "b" });
    expect(first.rawScores).toEqual(second.rawScores);
    expect(first.easterEggs).toHaveLength(1);
    expect(second.easterEggs).toHaveLength(0);
  });
  it("requires the non-scoring Q17 because it is part of the 16+1 flow", () => {
    const answers = { ...getExtremeAnswers(currentQuestionSet, "energy", "min") };
    delete answers.q17;
    expect(() => scoreAssessment(currentQuestionSet, answers)).toThrowError(
      expect.objectContaining({ code: "MISSING_ANSWERS" })
    );
  });
  it("returns a bloodline that totals 100 and a direction hint", () => {
    const result = scoreAssessment(
      currentQuestionSet,
      getExtremeAnswers(currentQuestionSet, "direction", "max")
    );
    expect(result.bloodline.purity).toBeGreaterThanOrEqual(55);
    expect(
      result.bloodline.purity +
        result.bloodline.hidden.reduce((sum, item) => sum + item.percentage, 0)
    ).toBe(100);
    expect(result.directionHint).toBe("clear-direction");
  });
  it("rejects missing, unknown, and invalid answers", () => {
    const complete = getExtremeAnswers(currentQuestionSet, "energy", "min");
    const missing = { ...complete } as Record<string, string>;
    delete missing.q1;
    expect(() => scoreAssessment(currentQuestionSet, missing)).toThrowError(
      AssessmentValidationError
    );
    expect(() => scoreAssessment(currentQuestionSet, { ...complete, unknown: "a" })).toThrowError(
      expect.objectContaining({ code: "UNKNOWN_QUESTION" })
    );
    expect(() => scoreAssessment(currentQuestionSet, { ...complete, q1: "z" })).toThrowError(
      expect.objectContaining({ code: "INVALID_OPTION" })
    );
  });
  it("returns the same result for the same answers", () => {
    const answers: AssessmentAnswers = Object.fromEntries(
      currentQuestionSet.questions.map((question) => [question.id, question.options[1]?.id ?? "a"])
    );
    expect(scoreAssessment(currentQuestionSet, answers)).toEqual(
      scoreAssessment(currentQuestionSet, answers)
    );
  });
});
