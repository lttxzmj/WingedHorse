import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Sse, MessageEvent } from "@nestjs/common";
import { deviceEffectRequestSchema } from "@wingedhorse/contracts";
import { map, Observable } from "rxjs";
import { DevicesService } from "./devices.service.js";

@Controller("devices")
export class DevicesController {
  constructor(@Inject(DevicesService) private readonly devices: DevicesService) {}

  @Post(":deviceId/effects")
  applyEffect(@Param("deviceId") deviceId: string, @Body() body: unknown) {
    const parsed = deviceEffectRequestSchema.safeParse({
      deviceId,
      ...(body as Record<string, unknown>)
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_DEVICE_EFFECT",
        message: "设备灯效请求格式不正确"
      });
    }
    return this.devices.applyMood(parsed.data.deviceId, parsed.data.mood);
  }

  /**
   * SSE 实时事件通道：网页前端连接该端点，实时接收硬件的触碰与人员靠近/Boss预警
   */
  @Sse(":deviceId/events")
  streamEvents(@Param("deviceId") deviceId: string): Observable<MessageEvent> {
    return this.devices.getEventsStream(deviceId).pipe(
      map((item) => ({
        data: item
      }))
    );
  }
}
