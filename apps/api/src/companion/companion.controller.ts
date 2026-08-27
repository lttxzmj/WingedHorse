import { BadRequestException, Body, Controller, Inject, Post } from "@nestjs/common";
import { companionMessageSchema } from "@wingedhorse/contracts";
import { CompanionService } from "./companion.service.js";

@Controller("companion")
export class CompanionController {
  constructor(@Inject(CompanionService) private readonly companion: CompanionService) {}

  @Post("messages")
  async message(@Body() body: unknown) {
    const parsed = companionMessageSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_COMPANION_MESSAGE",
        message: "消息格式不正确"
      });
    return this.companion.reply(parsed.data);
  }
}
