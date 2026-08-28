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
    return true; // 本地优先默认连接
  }

  private async getClient(): Promise<MqttClient> {
    if (this.client) return this.client;
    if (!this.connecting) {
      const url = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
      this.connecting = (async () => {
        const { connect } = await import("mqtt");
        const client = connect(url, {
          clientId: `wingedhorse-backend-${Math.random().toString(16).slice(2, 8)}`,
          reconnectPeriod: 2000,
          connectTimeout: 5000,
          clean: true,
          ...(process.env.MQTT_USER ? { username: process.env.MQTT_USER } : {}),
          ...(process.env.MQTT_PASSWORD ? { password: process.env.MQTT_PASSWORD } : {})
        });
        await new Promise<void>((resolve, reject) => {
          client.once("connect", () => {
            console.log(`[MQTT] 🚀 后端已成功连接到 MQTT Broker: ${url}`);
            resolve();
          });
          client.once("error", (error) => {
            console.error(`[MQTT] ❌ 连接 Broker 失败:`, error);
            reject(error);
          });
        });
        this.client = client;
        return client;
      })();
    }
    return this.connecting;
  }

  /** 发布一条消息；broker 不可用或未配置时静默返回，不抛异常。 */
  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.available) {
      console.warn(`[MQTT] ⚠️ 未配置 MQTT_URL，跳过发布消息到: ${topic}`);
      return;
    }
    try {
      const client = await this.getClient();
      await new Promise<void>((resolve, reject) => {
        const payloadStr = JSON.stringify(payload);
        client.publish(topic, payloadStr, { qos: 1 }, (error) => {
          if (error) {
            console.error(`[MQTT] ❌ 发送失败 -> Topic: ${topic}`, error);
            reject(error);
          } else {
            console.log(`[MQTT] 📤 已成功下发给硬件 -> Topic: ${topic} Payload: ${payloadStr}`);
            resolve();
          }
        });
      });
    } catch (err) {
      console.error(`[MQTT] ❌ 发送异常:`, err);
    }
  }

  /** 订阅 topic 并注册消息回调 */
  async subscribe(topic: string, onMessage: (topic: string, payload: Buffer) => void): Promise<void> {
    if (!this.available) return;
    try {
      const client = await this.getClient();
      client.subscribe(topic, { qos: 1 });
      client.on("message", (msgTopic, payload) => {
        if (msgTopic === topic || this.matchWildcard(topic, msgTopic)) {
          onMessage(msgTopic, payload);
        }
      });
    } catch {
      // 静默降级
    }
  }

  private matchWildcard(pattern: string, topic: string): boolean {
    const patternParts = pattern.split("/");
    const topicParts = topic.split("/");
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "#") return true;
      if (patternParts[i] !== "+" && patternParts[i] !== topicParts[i]) return false;
    }
    return patternParts.length === topicParts.length;
  }
}
