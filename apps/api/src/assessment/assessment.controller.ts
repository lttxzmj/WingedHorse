import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { assessmentSubmissionSchema } from "@wingedhorse/contracts";
import { AssessmentValidationError } from "@wingedhorse/domain";
import { AssessmentService } from "./assessment.service.js";

@Controller()
export class AssessmentController {
  constructor(@Inject(AssessmentService) private readonly assessments: AssessmentService) {}

  @Get("question-sets/current")
  getCurrentQuestionSet() {
    return this.assessments.getQuestionSet();
  }

  @Post("assessments")
  submit(@Body() body: unknown) {
    const parsed = assessmentSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: "INVALID_ASSESSMENT", message: "测评答案格式不正确" });
    }
    try {
      return this.assessments.submit(parsed.data);
    } catch (error) {
      if (error instanceof AssessmentValidationError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Get("assessments/:id/result")
  getResult(@Param("id") id: string) {
    return this.assessments.getResult(id);
  }
}
