import { BadRequestException, Body, Controller, Inject, Param, Post } from "@nestjs/common";
import { deviceEffectRequestSchema } from "@wingedhorse/contracts";
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
}
