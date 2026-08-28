import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

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
  | { granted: true; release: () => void }
  | { granted: false; reason: "session-budget" | "global-budget" | "session-busy" };

function configuredLimit(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class CompanionAccessService {
  private readonly salt = randomBytes(16);
  private readonly ipWindows = new Map<string, WindowCounter>();
  private readonly sessionWindows = new Map<string, WindowCounter>();
  private readonly sessionBudgets = new Map<string, SessionBudget>();
  private globalBudget: WindowCounter = { windowId: -1, count: 0, lastSeenAt: 0 };
  private checks = 0;

  checkRequest(clientAddress: string, sessionId: string, now = Date.now()): RequestAccessDecision {
    const minute = Math.floor(now / MINUTE_MS);
    const ip = this.consumeWindow(
      this.ipWindows,
      this.fingerprint(`ip:${clientAddress}`),
      minute,
      configuredLimit("COMPANION_IP_RATE_LIMIT_PER_MINUTE", 60),
      now
    );
    const session = this.consumeWindow(
      this.sessionWindows,
      this.fingerprint(`session:${sessionId}`),
      minute,
      configuredLimit("COMPANION_SESSION_RATE_LIMIT_PER_MINUTE", 20),
      now
    );
    this.pruneIfNeeded(now);
    if (ip && session) return { allowed: true };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(((minute + 1) * MINUTE_MS - now) / 1_000))
    };
  }

  acquireModel(sessionId: string, now = Date.now()): ModelAccessDecision {
    const day = Math.floor(now / DAY_MS);
    const key = this.fingerprint(`model:${sessionId}`);
    const current = this.sessionBudgets.get(key);
    const session: SessionBudget =
      current && current.windowId === day
        ? current
        : { windowId: day, count: 0, active: current?.active ?? 0, lastSeenAt: now };
    session.lastSeenAt = now;
    this.sessionBudgets.set(key, session);

    if (session.active >= 1) return { granted: false, reason: "session-busy" };
    if (session.count >= configuredLimit("COMPANION_SESSION_MODEL_BUDGET_PER_DAY", 40))
      return { granted: false, reason: "session-budget" };

    if (this.globalBudget.windowId !== day) {
      this.globalBudget = { windowId: day, count: 0, lastSeenAt: now };
    }
    if (this.globalBudget.count >= configuredLimit("COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY", 1_000))
      return { granted: false, reason: "global-budget" };

    session.count += 1;
    session.active += 1;
    this.globalBudget.count += 1;
    this.globalBudget.lastSeenAt = now;
    let released = false;
    return {
      granted: true,
      release: () => {
        if (released) return;
        released = true;
        session.active = Math.max(0, session.active - 1);
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
    return createHash("sha256").update(this.salt).update(value).digest("base64url");
  }

  private pruneIfNeeded(now: number) {
    this.checks += 1;
    if (this.checks % 256 !== 0 && this.ipWindows.size < MAX_TRACKED_CLIENTS) return;
    const removeBefore = now - DAY_MS;
    for (const store of [this.ipWindows, this.sessionWindows, this.sessionBudgets]) {
      for (const [key, value] of store) {
        const active = "active" in value ? value.active : 0;
        if (typeof active === "number" && active > 0) continue;
        if (value.lastSeenAt < removeBefore || store.size > MAX_TRACKED_CLIENTS) store.delete(key);
      }
    }
  }
}
