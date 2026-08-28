import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res
} from "@nestjs/common";
import { companionMessageSchema } from "@wingedhorse/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CompanionAccessService } from "./companion-access.service.js";
import { CompanionService } from "./companion.service.js";
import { SafetyService } from "./safety.service.js";

@Controller("companion")
export class CompanionController {
  constructor(
    @Inject(CompanionService) private readonly companion: CompanionService,
    @Inject(CompanionAccessService) private readonly access: CompanionAccessService,
    @Inject(SafetyService) private readonly safety: SafetyService
  ) {}

  @Post("messages")
  async message(@Body() body: unknown, @Req() request: FastifyRequest) {
    const parsed = await this.parseAndAuthorize(body, request);
    return this.companion.reply(parsed);
  }

  @Post("messages/stream")
  async messageStream(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    const parsed = await this.parseAndAuthorize(body, request);

    reply.hijack();
    reply.raw.statusCode = 200;
    reply.raw.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-store, no-transform");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    try {
      for await (const event of this.companion.replyStream(parsed)) {
        if (reply.raw.destroyed) break;
        reply.raw.write(`${JSON.stringify(event)}\n`);
      }
    } finally {
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.end();
    }
  }

  private async parseAndAuthorize(body: unknown, request: FastifyRequest) {
    const parsed = companionMessageSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_COMPANION_MESSAGE",
        message: "消息格式不正确"
      });
    if (this.safety.classify(parsed.data.message) === "normal") {
      const decision = await this.access.checkRequest(request.ip, parsed.data.sessionId);
      if (!decision.allowed) {
        throw new HttpException(
          {
            code: "COMPANION_RATE_LIMITED",
            message: "消息有点密，请稍后再试",
            retryAfterSeconds: decision.retryAfterSeconds
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }
    return parsed.data;
  }
}
