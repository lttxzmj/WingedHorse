import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException
} from "@nestjs/common";
import { companionMessageSchema, visitorTokenSchema } from "@wingedhorse/contracts";
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

  @Get("quota")
  async quota(@Headers("x-wingedhorse-visitor-token") token: string | undefined) {
    return this.access.getDeviceQuota(this.deviceToken(token));
  }

  @Post("messages")
  async message(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Headers("x-wingedhorse-visitor-token") token: string | undefined
  ) {
    const deviceToken = this.deviceToken(token);
    const parsed = await this.parseAndAuthorize(body, request);
    return this.companion.reply(parsed, deviceToken);
  }

  @Post("messages/stream")
  async messageStream(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Headers("x-wingedhorse-visitor-token") token: string | undefined
  ) {
    const deviceToken = this.deviceToken(token);
    const parsed = await this.parseAndAuthorize(body, request);

    reply.hijack();
    reply.raw.statusCode = 200;
    reply.raw.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-store, no-transform");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    const disconnect = new AbortController();
    const abortStream = () => disconnect.abort();
    reply.raw.once("close", abortStream);
    reply.raw.once("error", abortStream);
    try {
      for await (const event of this.companion.replyStream(
        parsed,
        deviceToken,
        disconnect.signal
      )) {
        if (reply.raw.destroyed || disconnect.signal.aborted) break;
        try {
          reply.raw.write(`${JSON.stringify(event)}\n`);
        } catch {
          disconnect.abort();
          break;
        }
      }
    } finally {
      disconnect.abort();
      reply.raw.off("close", abortStream);
      reply.raw.off("error", abortStream);
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.end();
    }
  }

  private deviceToken(value: string | undefined): string {
    const parsed = visitorTokenSchema.safeParse(value);
    if (!parsed.success)
      throw new UnauthorizedException({
        code: "VISITOR_TOKEN_REQUIRED",
        message: "需要本机访客凭证才能使用对话"
      });
    return parsed.data;
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
