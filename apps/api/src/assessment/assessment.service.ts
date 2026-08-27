import { Injectable, NotFoundException } from "@nestjs/common";
import { questionSetV1, scoreAssessment, type AssessmentResult } from "@wingedhorse/domain";
import type { AssessmentResultResponse, AssessmentSubmission } from "@wingedhorse/contracts";
import { randomUUID } from "node:crypto";

@Injectable()
export class AssessmentService {
  private readonly results = new Map<string, AssessmentResultResponse>();

  getQuestionSet() {
    return {
      ...questionSetV1,
      questions: questionSetV1.questions.map((question) => ({
        id: question.id,
        scene: question.scene,
        prompt: question.prompt,
        scored: question.scored,
        options: question.options.map((option) => ({ id: option.id, label: option.label }))
      }))
    };
  }

  submit(submission: AssessmentSubmission): AssessmentResultResponse {
    if (submission.questionSetId !== questionSetV1.id || submission.questionSetVersion !== questionSetV1.version) {
      throw new NotFoundException({ code: "QUESTION_SET_NOT_FOUND", message: "题目版本已更新，请重新开始测评" });
    }
    const result: AssessmentResult = scoreAssessment(questionSetV1, submission.answers);
    const response: AssessmentResultResponse = { id: randomUUID(), ...result };
    this.results.set(response.id, response);
    return response;
  }

  getResult(id: string): AssessmentResultResponse {
    const result = this.results.get(id);
    if (!result) throw new NotFoundException({ code: "ASSESSMENT_NOT_FOUND", message: "没有找到这次测评" });
    return result;
  }
}
