import { randomUUID } from "node:crypto";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

const RATE_SCRIPT = `
local ip = redis.call('INCR', KEYS[1])
if ip == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local session = redis.call('INCR', KEYS[2])
if session == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]) end
return {ip, session}
`;

const ACQUIRE_SCRIPT = `
if redis.call('SET', KEYS[3], ARGV[5], 'NX', 'EX', ARGV[4]) == false then
  return 3
end
local session = tonumber(redis.call('GET', KEYS[1]) or '0')
if session >= tonumber(ARGV[1]) then
  redis.call('DEL', KEYS[3])
  return 1
end
local global = tonumber(redis.call('GET', KEYS[2]) or '0')
if global >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[3])
  return 2
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
return 0
`;

const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export type RedisModelDecision =
  | { status: "granted"; release: () => Promise<void> }
  | { status: "device-budget" | "global-budget" | "session-busy" | "unavailable" };

@Injectable()
export class CompanionRedisStore implements OnModuleDestroy {
  private client: RedisClient | null = null;
  private connecting: Promise<RedisClient> | null = null;

  get configured() {
    return Boolean(process.env.REDIS_URL);
  }

  async consumeRate(
    ipKey: string,
    sessionKey: string,
    ipLimit: number,
    sessionLimit: number,
    ttlSeconds: number
  ): Promise<boolean | null> {
    try {
      const client = await this.getClient();
      if (!client) return null;
      const result = await client.sendCommand([
        "EVAL",
        RATE_SCRIPT,
        "2",
        `wingedhorse:companion:rate:ip:${ipKey}`,
        `wingedhorse:companion:rate:session:${sessionKey}`,
        String(ttlSeconds)
      ]);
      if (!Array.isArray(result) || result.length < 2) return null;
      return Number(result[0]) <= ipLimit && Number(result[1]) <= sessionLimit;
    } catch {
      return null;
    }
  }

  async getDeviceUsage(deviceKey: string, dayKey: string): Promise<number | null> {
    try {
      const client = await this.getClient();
      if (!client) return null;
      const value = await client.get(`wingedhorse:companion:model:device:${dayKey}:${deviceKey}`);
      if (value === null) return 0;
      const used = Number(value);
      return Number.isFinite(used) ? used : null;
    } catch {
      return null;
    }
  }

  async acquireModel(
    deviceKey: string,
    sessionKey: string,
    dayKey: string,
    deviceLimit: number,
    globalLimit: number,
    dayTtlSeconds: number,
    lockTtlSeconds: number
  ): Promise<RedisModelDecision> {
    const token = randomUUID();
    try {
      const client = await this.getClient();
      if (!client) return { status: "unavailable" };
      const lockKey = `wingedhorse:companion:model:active:${sessionKey}`;
      const result = Number(
        await client.sendCommand([
          "EVAL",
          ACQUIRE_SCRIPT,
          "3",
          `wingedhorse:companion:model:device:${dayKey}:${deviceKey}`,
          `wingedhorse:companion:model:global:${dayKey}`,
          lockKey,
          String(deviceLimit),
          String(globalLimit),
          String(dayTtlSeconds),
          String(lockTtlSeconds),
          token
        ])
      );
      if (result === 1) return { status: "device-budget" };
      if (result === 2) return { status: "global-budget" };
      if (result === 3) return { status: "session-busy" };
      if (result !== 0) return { status: "unavailable" };
      let released = false;
      return {
        status: "granted",
        release: async () => {
          if (released) return;
          released = true;
          try {
            const activeClient = await this.getClient();
            if (activeClient)
              await activeClient.sendCommand(["EVAL", RELEASE_SCRIPT, "1", lockKey, token]);
          } catch {
            // The lock has a short TTL, so an unavailable Redis cannot leave it stuck forever.
          }
        }
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.configured) return true;
    try {
      const client = await this.getClient();
      return client ? (await client.ping()) === "PONG" : false;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.close();
  }

  private async getClient(): Promise<RedisClient | null> {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    if (this.client?.isReady) return this.client;
    if (this.client) {
      if (this.client.isOpen) this.client.destroy();
      this.client = null;
    }
    if (!this.connecting) {
      const client = createClient({
        url,
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        socket: {
          connectTimeout: 1_500,
          reconnectStrategy: (retries) =>
            retries >= 8 ? false : Math.min(100 * 2 ** retries, 2_000)
        }
      });
      client.on("error", () => undefined);
      this.connecting = client
        .connect()
        .then(() => {
          this.client = client;
          return client;
        })
        .finally(() => {
          this.connecting = null;
        });
    }
    return this.connecting;
  }
}
