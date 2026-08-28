import { afterEach, describe, expect, it } from "vitest";
import { CompanionAccessService } from "./companion-access.service.js";

const ENV_KEYS = [
  "COMPANION_IP_RATE_LIMIT_PER_MINUTE",
  "COMPANION_SESSION_RATE_LIMIT_PER_MINUTE",
  "COMPANION_SESSION_MODEL_BUDGET_PER_DAY",
  "COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY"
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("CompanionAccessService", () => {
  it("limits a client address even when it rotates sessions", () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "1";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "5";
    const now = Date.UTC(2026, 7, 28, 8);
    const access = new CompanionAccessService();
    expect(access.checkRequest("203.0.113.5", "session-a", now).allowed).toBe(true);
    expect(access.checkRequest("203.0.113.5", "session-b", now + 1)).toMatchObject({
      allowed: false
    });
    expect(access.checkRequest("203.0.113.5", "session-a", now + 60_000).allowed).toBe(true);
  });

  it("limits a session even when the apparent client address changes", () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "5";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "1";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    expect(access.checkRequest("203.0.113.5", "session-a", now).allowed).toBe(true);
    expect(access.checkRequest("198.51.100.8", "session-a", now + 1)).toMatchObject({
      allowed: false
    });
  });

  it("enforces daily session and global model budgets", () => {
    process.env.COMPANION_SESSION_MODEL_BUDGET_PER_DAY = "2";
    process.env.COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY = "3";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    const first = access.acquireModel("session-a", now);
    expect(first.granted).toBe(true);
    if (first.granted) first.release();
    const second = access.acquireModel("session-a", now + 1);
    expect(second.granted).toBe(true);
    if (second.granted) second.release();
    expect(access.acquireModel("session-a", now + 2)).toEqual({
      granted: false,
      reason: "session-budget"
    });
    const third = access.acquireModel("session-b", now + 3);
    expect(third.granted).toBe(true);
    if (third.granted) third.release();
    expect(access.acquireModel("session-c", now + 4)).toEqual({
      granted: false,
      reason: "global-budget"
    });
  });

  it("allows only one active model request per session and releases idempotently", () => {
    const access = new CompanionAccessService();
    const first = access.acquireModel("session-a");
    expect(first.granted).toBe(true);
    expect(access.acquireModel("session-a")).toEqual({
      granted: false,
      reason: "session-busy"
    });
    if (first.granted) {
      first.release();
      first.release();
    }
    expect(access.acquireModel("session-a").granted).toBe(true);
  });
});
