import { Injectable } from "@nestjs/common";
import { moodToLight, type MoodId } from "@wingedhorse/domain";
import type { DeviceEffect } from "@wingedhorse/contracts";
import { MqttProvider } from "./mqtt.provider.js";

/**
 * 设备联动服务：把心情映射为灯效并下发到设备（MQTT）。
 * 设备鉴权由 broker ACL 负责（设备只能订阅自己 topic）；此处只做 topic 隔离下发。
 */
@Injectable()
export class DevicesService {
  constructor(private readonly mqtt: MqttProvider) {}

  async applyMood(deviceId: string, mood: MoodId): Promise<DeviceEffect> {
    const message: DeviceEffect = {
      seq: Math.floor(Date.now() / 1000),
      mood,
      effect: moodToLight(mood),
      ts: new Date().toISOString()
    };
    await this.mqtt.publish(`devices/${deviceId}/effect`, message);
    return message;
  }
}
