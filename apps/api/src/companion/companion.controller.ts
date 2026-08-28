import { BadRequestException, Body, Controller, Inject, Post, Res } from "@nestjs/common";
import { companionMessageSchema } from "@wingedhorse/contracts";
import type { FastifyReply } from "fastify";
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

  @Post("messages/stream")
  async messageStream(@Body() body: unknown, @Res() reply: FastifyReply) {
    const parsed = companionMessageSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_COMPANION_MESSAGE",
        message: "消息格式不正确"
      });

    reply.hijack();
    reply.raw.statusCode = 200;
    reply.raw.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-store, no-transform");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    try {
      for await (const event of this.companion.replyStream(parsed.data)) {
        if (reply.raw.destroyed) break;
        reply.raw.write(`${JSON.stringify(event)}\n`);
      }
    } finally {
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.end();
    }
  }
}
