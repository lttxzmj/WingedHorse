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
  it("limits a client address even when it rotates sessions", async () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "1";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "5";
    const now = Date.UTC(2026, 7, 28, 8);
    const access = new CompanionAccessService();
    expect((await access.checkRequest("203.0.113.5", "session-a", now)).allowed).toBe(true);
    await expect(access.checkRequest("203.0.113.5", "session-b", now + 1)).resolves.toMatchObject({
      allowed: false
    });
    expect((await access.checkRequest("203.0.113.5", "session-a", now + 60_000)).allowed).toBe(
      true
    );
  });

  it("limits a session even when the apparent client address changes", async () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "5";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "1";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    expect((await access.checkRequest("203.0.113.5", "session-a", now)).allowed).toBe(true);
    await expect(access.checkRequest("198.51.100.8", "session-a", now + 1)).resolves.toMatchObject({
      allowed: false
    });
  });

  it("enforces daily session and global model budgets", async () => {
    process.env.COMPANION_SESSION_MODEL_BUDGET_PER_DAY = "2";
    process.env.COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY = "3";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    const first = await access.acquireModel("session-a", now);
    expect(first.granted).toBe(true);
    if (first.granted) await first.release();
    const second = await access.acquireModel("session-a", now + 1);
    expect(second.granted).toBe(true);
    if (second.granted) await second.release();
    await expect(access.acquireModel("session-a", now + 2)).resolves.toEqual({
      granted: false,
      reason: "session-budget"
    });
    const third = await access.acquireModel("session-b", now + 3);
    expect(third.granted).toBe(true);
    if (third.granted) await third.release();
    await expect(access.acquireModel("session-c", now + 4)).resolves.toEqual({
      granted: false,
      reason: "global-budget"
    });
  });

  it("allows only one active model request per session and releases idempotently", async () => {
    const access = new CompanionAccessService();
    const first = await access.acquireModel("session-a");
    expect(first.granted).toBe(true);
    await expect(access.acquireModel("session-a")).resolves.toEqual({
      granted: false,
      reason: "session-busy"
    });
    if (first.granted) {
      await first.release();
      await first.release();
    }
    expect((await access.acquireModel("session-a")).granted).toBe(true);
  });

  it("fails model access closed when configured Redis is unavailable", async () => {
    const redis = {
      configured: true,
      acquireModel: () => Promise.resolve({ status: "unavailable" as const })
    };
    const access = new CompanionAccessService(redis as never);
    await expect(access.acquireModel("session-a")).resolves.toEqual({
      granted: false,
      reason: "capacity-unavailable"
    });
  });

  it("retains local request protection when configured Redis is unavailable", async () => {
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "1";
    const redis = {
      configured: true,
      consumeRate: () => Promise.resolve(null)
    };
    const access = new CompanionAccessService(redis as never);
    expect((await access.checkRequest("203.0.113.5", "session-a")).allowed).toBe(true);
    expect((await access.checkRequest("203.0.113.5", "session-b")).allowed).toBe(false);
  });
});
