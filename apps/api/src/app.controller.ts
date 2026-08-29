import { BadRequestException, Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import { analyticsEventSchema, purchaseIntentSchema } from "@wingedhorse/contracts";
import { AnalyticsRepository } from "./analytics/analytics.repository.js";

@Controller()
export class AppController {
  constructor(
    @Inject(AnalyticsRepository)
    private readonly analytics: AnalyticsRepository = new AnalyticsRepository()
  ) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      service: "wingedhorse-api",
      timestamp: new Date().toISOString()
    };
  }

  @Post("events")
  async ingestEvent(
    @Body() body: unknown,
    @Headers("x-wingedhorse-visitor-token") token?: string
  ) {
    const parsed = analyticsEventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("INVALID_EVENT");
    await this.analytics.recordEvent(parsed.data, token);
    return { accepted: true };
  }

  @Post("intents")
  async ingestIntent(
    @Body() body: unknown,
    @Headers("x-wingedhorse-visitor-token") token?: string
  ) {
    const parsed = purchaseIntentSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_INTENT",
        message: "联系方式格式不正确"
      });
    await this.analytics.recordIntent(parsed.data.contact, token);
    return { accepted: true };
  }
}
