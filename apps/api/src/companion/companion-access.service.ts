import { createHmac, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { CompanionRedisStore } from "./companion-redis.store.js";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MAX_TRACKED_CLIENTS = 10_000;

interface WindowCounter {
  windowId: number;
  count: number;
  lastSeenAt: number;
}

interface SessionBudget extends WindowCounter {
  active: number;
}

export type RequestAccessDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type ModelAccessDecision =
  | { granted: true; release: () => void | Promise<void>; remaining: number }
  | {
      granted: false;
      reason: "device-budget" | "global-budget" | "session-busy" | "capacity-unavailable";
      remaining: number;
    };

export interface DeviceModelQuota {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function configuredLimit(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/** Guest/device daily remote-model budget. DEVICE env wins; otherwise 15. */
export function deviceModelBudgetPerDay(): number {
  const device = Number(process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY);
  if (Number.isSafeInteger(device) && device > 0) return device;
  return 15;
}

@Injectable()
export class CompanionAccessService {
  private readonly salt = randomBytes(16);
  private readonly ipWindows = new Map<string, WindowCounter>();
  private readonly sessionWindows = new Map<string, WindowCounter>();
  private readonly deviceBudgets = new Map<string, SessionBudget>();
  private globalBudget: WindowCounter = { windowId: -1, count: 0, lastSeenAt: 0 };
  private checks = 0;

  constructor(
    @Inject(CompanionRedisStore)
    private readonly redis: CompanionRedisStore = new CompanionRedisStore()
  ) {}

  async checkRequest(
    clientAddress: string,
    sessionId: string,
    now = Date.now()
  ): Promise<RequestAccessDecision> {
    const minute = Math.floor(now / MINUTE_MS);
    const ipKey = this.fingerprint(`ip:${clientAddress}`);
    const sessionKey = this.fingerprint(`session:${sessionId}`);
    const ipLimit = configuredLimit("COMPANION_IP_RATE_LIMIT_PER_MINUTE", 60);
    const sessionLimit = configuredLimit("COMPANION_SESSION_RATE_LIMIT_PER_MINUTE", 8);
    if (this.redis.configured) {
      const allowed = await this.redis.consumeRate(
        ipKey,
        sessionKey,
        ipLimit,
        sessionLimit,
        Math.max(1, Math.ceil(((minute + 1) * MINUTE_MS - now) / 1_000) + 1)
      );
      if (allowed !== null)
        return allowed
          ? { allowed: true }
          : {
              allowed: false,
              retryAfterSeconds: Math.max(1, Math.ceil(((minute + 1) * MINUTE_MS - now) / 1_000))
            };
    }
    const ip = this.consumeWindow(this.ipWindows, ipKey, minute, ipLimit, now);
    const session = this.consumeWindow(this.sessionWindows, sessionKey, minute, sessionLimit, now);
    this.pruneIfNeeded(now);
    if (ip && session) return { allowed: true };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(((minute + 1) * MINUTE_MS - now) / 1_000))
    };
  }

  async getDeviceQuota(deviceToken: string, now = Date.now()): Promise<DeviceModelQuota> {
    const day = Math.floor(now / DAY_MS);
    const limit = deviceModelBudgetPerDay();
    const key = this.fingerprint(`model-device:${deviceToken}`);
    const local = this.deviceBudgets.get(key);
    const localUsed = local && local.windowId === day ? local.count : 0;
    let used = localUsed;
    if (this.redis.configured) {
      const remote = await this.redis.getDeviceUsage(key, String(day));
      if (remote !== null) used = remote;
    }
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: new Date((day + 1) * DAY_MS).toISOString()
    };
  }

  async acquireModel(
    deviceToken: string,
    sessionId: string,
    now = Date.now()
  ): Promise<ModelAccessDecision> {
    const day = Math.floor(now / DAY_MS);
    const deviceKey = this.fingerprint(`model-device:${deviceToken}`);
    const sessionKey = this.fingerprint(`model-session:${sessionId}`);
    const deviceLimit = deviceModelBudgetPerDay();
    const globalLimit = configuredLimit("COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY", 1_000);

    if (this.redis.configured) {
      const result = await this.redis.acquireModel(
        deviceKey,
        sessionKey,
        String(day),
        deviceLimit,
        globalLimit,
        Math.max(60, Math.ceil(((day + 1) * DAY_MS - now) / 1_000) + 60),
        Math.max(30, Math.ceil(configuredLimit("OPENROUTER_TIMEOUT_MS", 15_000) / 1_000) + 15)
      );
      if (result.status === "granted") {
        const quota = await this.getDeviceQuota(deviceToken, now);
        return { granted: true, release: result.release, remaining: quota.remaining };
      }
      const remaining =
        result.status === "device-budget" ? 0 : (await this.getDeviceQuota(deviceToken, now)).remaining;
      return {
        granted: false,
        reason: result.status === "unavailable" ? "capacity-unavailable" : result.status,
        remaining
      };
    }

    const current = this.deviceBudgets.get(deviceKey);
    const device: SessionBudget =
      current && current.windowId === day
        ? current
        : { windowId: day, count: 0, active: current?.active ?? 0, lastSeenAt: now };
    // Session busy is tracked on device.active for in-memory single-flight per device+session:
    // use a separate map entry keyed by session for active lock.
    const lockKey = sessionKey;
    const lockCurrent = this.deviceBudgets.get(lockKey);
    const lock: SessionBudget =
      lockCurrent && lockCurrent.windowId === day
        ? lockCurrent
        : { windowId: day, count: 0, active: 0, lastSeenAt: now };

    device.lastSeenAt = now;
    lock.lastSeenAt = now;
    this.deviceBudgets.set(deviceKey, device);
    this.deviceBudgets.set(lockKey, lock);

    if (lock.active >= 1)
      return { granted: false, reason: "session-busy", remaining: Math.max(0, deviceLimit - device.count) };
    if (device.count >= deviceLimit)
      return { granted: false, reason: "device-budget", remaining: 0 };

    if (this.globalBudget.windowId !== day) {
      this.globalBudget = { windowId: day, count: 0, lastSeenAt: now };
    }
    if (this.globalBudget.count >= globalLimit)
      return {
        granted: false,
        reason: "global-budget",
        remaining: Math.max(0, deviceLimit - device.count)
      };

    device.count += 1;
    lock.active += 1;
    this.globalBudget.count += 1;
    this.globalBudget.lastSeenAt = now;
    let released = false;
    return {
      granted: true,
      remaining: Math.max(0, deviceLimit - device.count),
      release: () => {
        if (released) return;
        released = true;
        lock.active = Math.max(0, lock.active - 1);
      }
    };
  }

  private consumeWindow(
    store: Map<string, WindowCounter>,
    key: string,
    windowId: number,
    limit: number,
    now: number
  ) {
    const previous = store.get(key);
    const counter =
      previous && previous.windowId === windowId
        ? previous
        : { windowId, count: 0, lastSeenAt: now };
    counter.lastSeenAt = now;
    if (counter.count >= limit) {
      store.set(key, counter);
      return false;
    }
    counter.count += 1;
    store.set(key, counter);
    return true;
  }

  private fingerprint(value: string) {
    const secret = process.env.COMPANION_FINGERPRINT_SECRET ?? this.salt;
    return createHmac("sha256", secret).update(value).digest("base64url");
  }

  private pruneIfNeeded(now: number) {
    this.checks += 1;
    if (this.checks % 256 !== 0 && this.ipWindows.size < MAX_TRACKED_CLIENTS) return;
    const removeBefore = now - DAY_MS;
    for (const store of [this.ipWindows, this.sessionWindows, this.deviceBudgets]) {
      for (const [key, value] of store) {
        const active = "active" in value ? value.active : 0;
        if (typeof active === "number" && active > 0) continue;
        if (value.lastSeenAt < removeBefore || store.size > MAX_TRACKED_CLIENTS) store.delete(key);
      }
    }
  }
}
