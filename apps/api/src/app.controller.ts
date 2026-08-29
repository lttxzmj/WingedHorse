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
  ServiceUnavailableException
} from "@nestjs/common";
import { analyticsEventSchema, purchaseIntentSchema } from "@wingedhorse/contracts";
import type { FastifyRequest } from "fastify";
import { AnalyticsRepository } from "./analytics/analytics.repository.js";
import { CompanionRedisStore } from "./companion/companion-redis.store.js";

@Controller()
export class AppController {
  private readonly writeWindows = new Map<string, { count: number; resetsAt: number }>();

  constructor(
    @Inject(AnalyticsRepository)
    private readonly analytics: AnalyticsRepository = new AnalyticsRepository(),
    @Inject(CompanionRedisStore)
    private readonly redis: CompanionRedisStore = new CompanionRedisStore()
  ) {}

  @Get("health")
  async health() {
    const [database, redis] = await Promise.all([
      this.analytics.checkHealth(),
      this.redis.checkHealth()
    ]);
    if (!database || !redis)
      throw new ServiceUnavailableException({
        code: "DEPENDENCY_UNAVAILABLE",
        message: "服务依赖暂时不可用"
      });
    return {
      status: "ok",
      service: "wingedhorse-api",
      timestamp: new Date().toISOString()
    };
  }

  @Post("events")
  async ingestEvent(
    @Body() body: unknown,
    @Headers("x-wingedhorse-visitor-token") token?: string,
    @Req() request?: FastifyRequest
  ) {
    this.assertWriteRate(`event:${request?.ip ?? "test"}`, 120);
    const parsed = analyticsEventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("INVALID_EVENT");
    await this.analytics.recordEvent(parsed.data, token);
    return { accepted: true };
  }

  @Post("intents")
  async ingestIntent(
    @Body() body: unknown,
    @Headers("x-wingedhorse-visitor-token") token?: string,
    @Req() request?: FastifyRequest
  ) {
    this.assertWriteRate(`intent:${request?.ip ?? "test"}`, 10);
    const parsed = purchaseIntentSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_INTENT",
        message: "联系方式格式不正确"
      });
    await this.analytics.recordIntent(parsed.data.contact, token);
    return { accepted: true };
  }

  private assertWriteRate(key: string, limit: number) {
    const now = Date.now();
    const current = this.writeWindows.get(key);
    if (!current || current.resetsAt <= now) {
      if (this.writeWindows.size >= 10_000) {
        for (const [storedKey, window] of this.writeWindows) {
          if (window.resetsAt <= now) this.writeWindows.delete(storedKey);
        }
        if (this.writeWindows.size >= 10_000) {
          const oldest = this.writeWindows.keys().next().value;
          if (oldest) this.writeWindows.delete(oldest);
        }
      }
      this.writeWindows.set(key, { count: 1, resetsAt: now + 60_000 });
      return;
    }
    current.count += 1;
    if (current.count > limit) {
      throw new HttpException(
        {
          code: "WRITE_RATE_LIMITED",
          message: "请求过于频繁，请稍后再试",
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1_000))
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
