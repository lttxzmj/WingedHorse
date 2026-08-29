import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import {
  deriveHardwareEvent,
  moodToLight,
  type HardwareInteractionEvent,
  type MoodId
} from "@wingedhorse/domain";
import {
  deviceTelemetrySchema,
  type DeviceEffect,
  type DeviceTelemetry
} from "@wingedhorse/contracts";
import { Observable, Subject } from "rxjs";
import { MqttProvider } from "./mqtt.provider.js";

/**
 * 设备联动服务：
 * 1. 下行：把心情映射为灯效下发给设备（MQTT）。
 * 2. 上行：监听设备遥测上报，并广播给前端 SSE 事件流。
 */
const ONLINE_WINDOW_MS = 90_000;

@Injectable()
export class DevicesService implements OnModuleInit, OnModuleDestroy {
  private readonly telemetrySubject = new Subject<{
    deviceId: string;
    telemetry: DeviceTelemetry;
    event: HardwareInteractionEvent | null;
  }>();
  private readonly lastSeenAt = new Map<string, number>();

  constructor(@Inject(MqttProvider) private readonly mqtt: MqttProvider) {}

  async onModuleInit() {
    // 订阅所有设备的上报 telemetry topic，同时兼容各种前缀格式
    if (this.mqtt.available) {
      await Promise.all([
        this.mqtt.subscribe("devices/+/telemetry", (topic, payload) =>
          this.handleIncomingTelemetry(topic, payload)
        ),
        this.mqtt.subscribe("+/telemetry", (topic, payload) =>
          this.handleIncomingTelemetry(topic, payload)
        ),
        this.mqtt.subscribe("+/data", (topic, payload) =>
          this.handleIncomingTelemetry(topic, payload)
        ),
        this.mqtt.subscribe("devices/+/data", (topic, payload) =>
          this.handleIncomingTelemetry(topic, payload)
        )
      ]);
    }
  }

  onModuleDestroy() {
    this.telemetrySubject.complete();
  }

  handleIncomingTelemetry(topic: string, payload: Buffer) {
    try {
      const rawText = payload.toString("utf-8");
      const json = JSON.parse(rawText) as Record<string, unknown>;
      const ultrasonic = json.ultrasonic as Record<string, unknown> | undefined;
      const pressure = json.pressure as Record<string, unknown> | undefined;
      const led1Obj = json.led1 as Record<string, unknown> | undefined;
      const led2Obj = json.led2 as Record<string, unknown> | undefined;
      const dhtObj = json.dht as Record<string, unknown> | undefined;
      const envObj = json.env as Record<string, unknown> | undefined;
      const interaction = typeof json.interaction === "string" ? json.interaction : null;

      const rawLed1 = typeof led1Obj?.state === "string" ? led1Obj.state : json.led1;
      const rawLed2 = typeof led2Obj?.state === "string" ? led2Obj.state : json.led2;
      const dhtTemp =
        typeof dhtObj?.temperature === "number"
          ? dhtObj.temperature
          : typeof envObj?.temperatureC === "number"
            ? envObj.temperatureC
            : typeof json.temperature === "number"
              ? json.temperature
              : null;
      const dhtHum =
        typeof dhtObj?.humidity === "number"
          ? dhtObj.humidity
          : typeof envObj?.humidityPct === "number"
            ? envObj.humidityPct
            : typeof json.humidity === "number"
              ? json.humidity
              : null;

      const deviceIdStr =
        (typeof json.deviceId === "string" ? json.deviceId : null) ||
        (typeof json.device_id === "string" ? json.device_id : null) ||
        (typeof json.id === "string" ? json.id : null) ||
        topic.split("/")[1] ||
        "unknown";
      this.touch(deviceIdStr);

      // 固件 FSR 上报 { interaction: "tap" | "rest_on" | "rest_off" }，映射到领域触摸语义。
      let pressureValue = Number(pressure?.value ?? json.pressure ?? 0);
      let hasPress = Boolean(json.hasPress ?? json.has_pressure ?? pressure?.has_pressure);
      if (interaction === "tap") {
        hasPress = true;
        if (!(pressureValue > 100)) pressureValue = 1200;
      } else if (interaction === "rest_on") {
        hasPress = true;
        if (!(pressureValue > 100)) pressureValue = 320;
      }

      const normalizedData = {
        deviceId: deviceIdStr,
        obstacle: Boolean(json.obstacle ?? ultrasonic?.obstacle),
        pressure: pressureValue,
        hasPress,
        led1: typeof rawLed1 === "string" ? rawLed1 : "off",
        led2: typeof rawLed2 === "string" ? rawLed2 : "off",
        dht: {
          temperature: typeof dhtTemp === "number" ? dhtTemp : null,
          humidity: typeof dhtHum === "number" ? dhtHum : null
        },
        env: {
          temperatureC: typeof dhtTemp === "number" ? dhtTemp : undefined,
          humidityPct: typeof dhtHum === "number" ? dhtHum : undefined
        },
        heartTrend:
          json.heartTrend === "calm" ||
          json.heartTrend === "active" ||
          json.heartTrend === "elevated"
            ? json.heartTrend
            : undefined,
        timestamp:
          typeof json.timestamp === "number" ? json.timestamp : Math.floor(Date.now() / 1000)
      };

      const parsed = deviceTelemetrySchema.safeParse(normalizedData);
      if (parsed.success) {
        // rest_off 仅同步状态，不派生触摸事件。
        const event =
          interaction === "rest_off" ? null : deriveHardwareEvent(parsed.data);
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

  getStatus(deviceId: string, now = Date.now()) {
    const lastSeen = this.lastSeenAt.get(deviceId);
    return {
      deviceId,
      online: typeof lastSeen === "number" && now - lastSeen <= ONLINE_WINDOW_MS,
      lastSeenAt: typeof lastSeen === "number" ? new Date(lastSeen).toISOString() : null
    };
  }

  getEventsStream(deviceId: string): Observable<{
    deviceId: string;
    telemetry: DeviceTelemetry;
    event: HardwareInteractionEvent | null;
  }> {
    return new Observable((subscriber) => {
      console.log(`[DevicesService] 客户端建立 SSE 监听, target deviceId: ${deviceId}`);
      const subscription = this.telemetrySubject.subscribe((item) => {
        if (item.deviceId === deviceId) subscriber.next(item);
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
    await this.mqtt.publish(`devices/${deviceId}/effect`, message);
    return message;
  }

  private touch(deviceId: string, now = Date.now()) {
    if (!deviceId || deviceId === "unknown") return;
    this.lastSeenAt.set(deviceId, now);
    if (this.lastSeenAt.size > 2_000) {
      const staleBefore = now - ONLINE_WINDOW_MS * 20;
      for (const [id, seen] of this.lastSeenAt) {
        if (seen < staleBefore) this.lastSeenAt.delete(id);
      }
    }
  }
}
