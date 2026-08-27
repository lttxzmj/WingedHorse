import { Injectable } from "@nestjs/common";
import type { MqttClient } from "mqtt";

/**
 * MQTT 发布适配器。未配置 broker 时优雅降级为 no-op，
 * 使问卷/游戏/聊天在弱网或无 broker 环境下仍可用。
 * 配置：MQTT_URL（必填）、MQTT_USER、MQTT_PASSWORD。
 */
@Injectable()
export class MqttProvider {
  private client: MqttClient | null = null;
  private connecting: Promise<MqttClient> | null = null;

  get url(): string | undefined {
    return process.env.MQTT_URL;
  }

  get available(): boolean {
    return Boolean(this.url);
  }

  private async getClient(): Promise<MqttClient> {
    if (this.client) return this.client;
    if (!this.connecting) {
      const url = this.url;
      if (!url) throw new Error("MQTT_NOT_CONFIGURED");
      this.connecting = (async () => {
        const { connect } = await import("mqtt");
        const client = connect(url, {
          reconnectPeriod: 5000,
          connectTimeout: 8000,
          ...(process.env.MQTT_USER ? { username: process.env.MQTT_USER } : {}),
          ...(process.env.MQTT_PASSWORD ? { password: process.env.MQTT_PASSWORD } : {})
        });
        await new Promise<void>((resolve, reject) => {
          client.once("connect", () => resolve());
          client.once("error", (error) => reject(error));
        });
        this.client = client;
        return client;
      })();
    }
    return this.connecting;
  }

  /** 发布一条消息；broker 不可用或未配置时静默返回，不抛异常。 */
  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.available) return;
    try {
      const client = await this.getClient();
      await new Promise<void>((resolve, reject) => {
        client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch {
      // 静默降级：不因设备联动失败影响主流程
    }
  }
}
