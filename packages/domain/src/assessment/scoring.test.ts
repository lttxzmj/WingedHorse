import { describe, expect, it } from "vitest";
import { questionSetV1 } from "./question-set-v1.js";
import { AssessmentValidationError, classifyScores, computeReachableRanges, getExtremeAnswers, scoreAssessment } from "./scoring.js";
import type { AssessmentAnswers, Dimension } from "./types.js";

const dimensions: Dimension[] = ["energy", "engine", "chaos", "direction"];
describe("assessment scoring", () => {
  it("derives the audited reachable ranges from question data", () => {
    expect(computeReachableRanges(questionSetV1)).toEqual({
      energy:{ min:-16, max:16 }, engine:{ min:-12, max:14 },
      chaos:{ min:-11, max:19 }, direction:{ min:-9, max:10 }
    });
  });
  it.each(dimensions)("maps the %s reachable extremes to 0 and 100", (dimension) => {
    expect(scoreAssessment(questionSetV1, getExtremeAnswers(questionSetV1, dimension, "min")).normalizedScores[dimension]).toBe(0);
    expect(scoreAssessment(questionSetV1, getExtremeAnswers(questionSetV1, dimension, "max")).normalizedScores[dimension]).toBe(100);
  });
  it("keeps deterministic sampled answer sets inside 0–100", () => {
    let state = 20260827;
    for (let sample=0; sample<1000; sample+=1) {
      const answers: Record<string,string> = {};
      for (const question of questionSetV1.questions) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const option = question.options[state % question.options.length];
        if (!option) throw new Error("Question must contain an option");
        answers[question.id] = option.id;
      }
      for (const score of Object.values(scoreAssessment(questionSetV1, answers).normalizedScores)) {
        expect(score).toBeGreaterThanOrEqual(0); expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
  it("uses inclusive 50-point type boundaries", () => {
    expect(classifyScores({ energy:50, engine:50, chaos:49.99, direction:0 })).toBe("chosen");
    expect(classifyScores({ energy:50, engine:50, chaos:50, direction:0 })).toBe("perpetual");
    expect(classifyScores({ energy:49.99, engine:49.99, chaos:50, direction:100 })).toBe("mad-literature");
  });
  it("does not score Q17 and only returns its optional easter egg", () => {
    const answers = getExtremeAnswers(questionSetV1, "energy", "min");
    const first = scoreAssessment(questionSetV1, { ...answers, q17:"a" });
    const second = scoreAssessment(questionSetV1, { ...answers, q17:"b" });
    expect(first.rawScores).toEqual(second.rawScores);
    expect(first.easterEggs).toHaveLength(1); expect(second.easterEggs).toHaveLength(0);
  });
  it("rejects missing, unknown, and invalid answers", () => {
    const complete = getExtremeAnswers(questionSetV1, "energy", "min");
    const missing = { ...complete } as Record<string,string>; delete missing.q1;
    expect(() => scoreAssessment(questionSetV1, missing)).toThrowError(AssessmentValidationError);
    expect(() => scoreAssessment(questionSetV1, { ...complete, unknown:"a" })).toThrowError(expect.objectContaining({ code:"UNKNOWN_QUESTION" }));
    expect(() => scoreAssessment(questionSetV1, { ...complete, q1:"z" })).toThrowError(expect.objectContaining({ code:"INVALID_OPTION" }));
  });
  it("returns the same result for the same answers", () => {
    const answers: AssessmentAnswers = Object.fromEntries(questionSetV1.questions.map((question) => [question.id, question.options[1]?.id ?? "a"]));
    expect(scoreAssessment(questionSetV1, answers)).toEqual(scoreAssessment(questionSetV1, answers));
  });
});
