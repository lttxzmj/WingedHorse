import { describe, expect, it } from "vitest";
import { getExtremeAnswers, questionSetV1 } from "@wingedhorse/domain";
import { AssessmentService } from "./assessment.service.js";

describe("AssessmentService", () => {
  it("returns public questions without score effects", () => {
    const questionSet = new AssessmentService().getQuestionSet();
    expect(questionSet.questions).toHaveLength(17);
    expect(questionSet.questions[0]?.options[0]).toEqual({
      id: "a",
      label: "闹钟没响我就醒了，甚至有点期待今天"
    });
    expect(questionSet.questions[0]?.options[0]).not.toHaveProperty("effects");
  });

  it("stores and retrieves a deterministic result", () => {
    const service = new AssessmentService();
    const created = service.submit({
      questionSetId: questionSetV1.id,
      questionSetVersion: questionSetV1.version,
      answers: getExtremeAnswers(questionSetV1, "energy", "max")
    });
    expect(service.getResult(created.id)).toEqual(created);
    expect(created.normalizedScores.energy).toBe(100);
  });
});
