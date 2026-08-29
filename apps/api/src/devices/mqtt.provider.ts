import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { MqttClient } from "mqtt";

/**
 * MQTT 发布适配器。未配置 broker 时优雅降级为 no-op，
 * 使问卷/游戏/聊天在弱网或无 broker 环境下仍可用。
 * 配置：MQTT_URL（必填）、MQTT_USER、MQTT_PASSWORD。
 */
@Injectable()
export class MqttProvider implements OnModuleDestroy {
  private client: MqttClient | null = null;
  private connecting: Promise<MqttClient> | null = null;
  private readonly handlers = new Map<string, Set<(topic: string, payload: Buffer) => void>>();

  get url(): string | undefined {
    return process.env.MQTT_URL;
  }

  get available(): boolean {
    return process.env.HARDWARE_API_ENABLED === "true" && Boolean(this.url);
  }

  private async getClient(): Promise<MqttClient> {
    if (this.client) return this.client;
    if (!this.connecting) {
      const url = this.url;
      if (!url || !this.available) throw new Error("MQTT_DISABLED");
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
        try {
          await new Promise<void>((resolve, reject) => {
            client.once("connect", () => resolve());
            client.once("error", reject);
          });
        } catch (error) {
          client.end(true);
          throw error;
        }
        client.on("error", (error) => {
          console.warn("[MQTT] Broker connection error", error.message);
        });
        client.on("message", (topic, payload) => {
          for (const [pattern, callbacks] of this.handlers) {
            if (topic !== pattern && !this.matchWildcard(pattern, topic)) continue;
            for (const callback of callbacks) callback(topic, payload);
          }
        });
        this.client = client;
        console.log(`[MQTT] Connected to ${new URL(url).hostname}`);
        return client;
      })().finally(() => {
        this.connecting = null;
      });
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
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.warn(
        `[MQTT] Publish failed for ${topic}`,
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  /** 订阅 topic 并注册消息回调。 */
  async subscribe(
    topic: string,
    onMessage: (topic: string, payload: Buffer) => void
  ): Promise<void> {
    if (!this.available) return;
    const callbacks = this.handlers.get(topic) ?? new Set();
    callbacks.add(onMessage);
    this.handlers.set(topic, callbacks);
    try {
      const client = await this.getClient();
      await new Promise<void>((resolve, reject) => {
        client.subscribe(topic, { qos: 1 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      callbacks.delete(onMessage);
      if (callbacks.size === 0) this.handlers.delete(topic);
      console.warn(
        `[MQTT] Subscription failed for ${topic}`,
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.handlers.clear();
    const client = this.client;
    this.client = null;
    if (!client) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        client.end(true);
        resolve();
      }, 2_000).unref();
      client.end(false, {}, () => {
        clearTimeout(timeout);
        resolve();
      });
    });
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
