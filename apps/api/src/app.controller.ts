import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { analyticsEventSchema } from "@wingedhorse/contracts";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "wingedhorse-api",
      timestamp: new Date().toISOString()
    };
  }

  @Post("events")
  ingestEvent(@Body() body: unknown) {
    const parsed = analyticsEventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("INVALID_EVENT");
    return { accepted: true };
  }
}
