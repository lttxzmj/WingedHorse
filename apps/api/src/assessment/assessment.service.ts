import { Injectable, NotFoundException } from "@nestjs/common";
import { currentQuestionSet, scoreAssessment, type AssessmentResult } from "@wingedhorse/domain";
import type { AssessmentResultResponse, AssessmentSubmission } from "@wingedhorse/contracts";
import { randomUUID } from "node:crypto";

const MAX_RESULTS = 5_000;
const RESULT_TTL_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class AssessmentService {
  private readonly results = new Map<
    string,
    { value: AssessmentResultResponse; expiresAt: number }
  >();

  getQuestionSet() {
    return {
      ...currentQuestionSet,
      questions: currentQuestionSet.questions.map((question) => ({
        id: question.id,
        scene: question.scene,
        prompt: question.prompt,
        scored: question.scored,
        options: question.options.map((option) => ({ id: option.id, label: option.label }))
      }))
    };
  }

  submit(submission: AssessmentSubmission): AssessmentResultResponse {
    if (
      submission.questionSetId !== currentQuestionSet.id ||
      submission.questionSetVersion !== currentQuestionSet.version
    ) {
      throw new NotFoundException({
        code: "QUESTION_SET_NOT_FOUND",
        message: "题目版本已更新，请重新开始测评"
      });
    }
    const result: AssessmentResult = scoreAssessment(currentQuestionSet, submission.answers);
    const response: AssessmentResultResponse = { id: randomUUID(), ...result };
    if (this.results.size >= MAX_RESULTS) {
      const oldestId = this.results.keys().next().value;
      if (oldestId) this.results.delete(oldestId);
    }
    this.results.set(response.id, {
      value: response,
      expiresAt: Date.now() + RESULT_TTL_MS
    });
    return response;
  }

  getResult(id: string): AssessmentResultResponse {
    const result = this.results.get(id);
    if (!result || result.expiresAt <= Date.now()) {
      if (result) this.results.delete(id);
      throw new NotFoundException({ code: "ASSESSMENT_NOT_FOUND", message: "没有找到这次测评" });
    }
    return result.value;
  }
}
