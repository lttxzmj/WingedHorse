import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { moodToLight, deriveHardwareEvent, type MoodId, type HardwareInteractionEvent } from "@wingedhorse/domain";
import { deviceTelemetrySchema, type DeviceEffect, type DeviceTelemetry } from "@wingedhorse/contracts";
import { Subject, Observable } from "rxjs";
import { MqttProvider } from "./mqtt.provider.js";

/**
 * 设备联动服务：
 * 1. 下行：把心情映射为灯效下发给设备（MQTT）。
 * 2. 上行：监听设备遥测上报，并广播给前端 SSE 事件流。
 */
@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly telemetrySubject = new Subject<{
    deviceId: string;
    telemetry: DeviceTelemetry;
    event: HardwareInteractionEvent | null;
  }>();

  constructor(@Inject(MqttProvider) private readonly mqtt: MqttProvider) {}

  async onModuleInit() {
    // 订阅所有设备的上报 telemetry topic，同时兼容各种前缀格式
    if (this.mqtt?.subscribe) {
      await Promise.all([
        this.mqtt.subscribe("devices/+/telemetry", (topic, payload) => this.handleIncomingTelemetry(topic, payload)),
        this.mqtt.subscribe("+/telemetry", (topic, payload) => this.handleIncomingTelemetry(topic, payload)),
        this.mqtt.subscribe("+/data", (topic, payload) => this.handleIncomingTelemetry(topic, payload)),
        this.mqtt.subscribe("devices/+/data", (topic, payload) => this.handleIncomingTelemetry(topic, payload))
      ]);
    }
  }

  handleIncomingTelemetry(topic: string, payload: Buffer) {
    try {
      const rawText = payload.toString("utf-8");
      console.log(`[MQTT] 📥 收到硬件上报 <- Topic: ${topic} Payload: ${rawText}`);
      const json = JSON.parse(rawText);
      // 兼容两种格式：嵌套 ultrasonic.obstacle/pressure.has_pressure 或 扁平 obstacle/has_pressure
      const normalizedData = {
        deviceId: json.deviceId || json.device_id || json.id || topic.split("/")[1] || "unknown",
        obstacle: Boolean(json.obstacle ?? json.ultrasonic?.obstacle),
        pressure: Number(json.pressure?.value ?? json.pressure ?? 0),
        hasPress: Boolean(json.hasPress ?? json.has_pressure ?? json.pressure?.has_pressure),
        led1: (json.led1?.state ?? json.led1) === "on" ? "on" : "off",
        led2: (json.led2?.state ?? json.led2) === "on" ? "on" : "off",
        timestamp: json.timestamp || Math.floor(Date.now() / 1000)
      };

      const parsed = deviceTelemetrySchema.safeParse(normalizedData);
      if (parsed.success) {
        const event = deriveHardwareEvent(parsed.data);
        this.telemetrySubject.next({
          deviceId: parsed.data.deviceId,
          telemetry: parsed.data,
          event
        });
      }
    } catch {
      // 忽略无法解析的脏数据
    }
  }

  getEventsStream(deviceId: string): Observable<{
    deviceId: string;
    telemetry: DeviceTelemetry;
    event: HardwareInteractionEvent | null;
  }> {
    return new Observable((subscriber) => {
      console.log(`[DevicesService] 客户端建立 SSE 监听, target deviceId: ${deviceId}`);
      const subscription = this.telemetrySubject.subscribe((item) => {
        // 如果 target 为 lamp-001 或设备匹配，则推送
        if (!deviceId || item.deviceId === deviceId || item.deviceId === "lamp-001" || deviceId === "lamp-001") {
          subscriber.next(item);
        }
      });
      return () => {
        console.log(`[DevicesService] 客户端断开 SSE 监听: ${deviceId}`);
        subscription.unsubscribe();
      };
    });
  }

  async applyMood(deviceId: string, mood: MoodId): Promise<DeviceEffect> {
    const message: DeviceEffect = {
      seq: Math.floor(Date.now() / 1000),
      mood,
      effect: moodToLight(mood),
      ts: new Date().toISOString()
    };
    // 同时广播到标准 topic 和扁平 topic，确保无论硬件订阅哪种都能 100% 收到
    await Promise.all([
      this.mqtt.publish(`devices/${deviceId}/effect`, message),
      this.mqtt.publish(`${deviceId}/effect`, message),
      this.mqtt.publish(`${deviceId}/cmd`, message),
      this.mqtt.publish(`${deviceId}`, message)
    ]);
    return message;
  }
}
