import { afterEach, describe, expect, it } from "vitest";
import { CompanionAccessService } from "./companion-access.service.js";

const ENV_KEYS = [
  "COMPANION_IP_RATE_LIMIT_PER_MINUTE",
  "COMPANION_SESSION_RATE_LIMIT_PER_MINUTE",
  "COMPANION_DEVICE_MODEL_BUDGET_PER_DAY",
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

  it("enforces daily device budget across session ids (no-login guest)", async () => {
    process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY = "2";
    process.env.COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY = "10";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    const device = "device-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const first = await access.acquireModel(device, "session-a", now);
    expect(first.granted).toBe(true);
    if (first.granted) await first.release();
    const second = await access.acquireModel(device, "session-b", now + 1);
    expect(second.granted).toBe(true);
    if (second.granted) await second.release();
    await expect(access.acquireModel(device, "session-c", now + 2)).resolves.toMatchObject({
      granted: false,
      reason: "device-budget",
      remaining: 0
    });
    const quota = await access.getDeviceQuota(device, now + 3);
    expect(quota).toMatchObject({ limit: 2, used: 2, remaining: 0 });
  });

  it("enforces global model budget across devices", async () => {
    process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY = "5";
    process.env.COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY = "2";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    const first = await access.acquireModel("device-a-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "s1", now);
    expect(first.granted).toBe(true);
    if (first.granted) await first.release();
    const second = await access.acquireModel("device-b-cccccccccccccccccccccccccccccccc", "s2", now + 1);
    expect(second.granted).toBe(true);
    if (second.granted) await second.release();
    await expect(
      access.acquireModel("device-c-dddddddddddddddddddddddddddddddd", "s3", now + 2)
    ).resolves.toMatchObject({
      granted: false,
      reason: "global-budget"
    });
  });

  it("allows only one active model request per session and releases idempotently", async () => {
    const access = new CompanionAccessService();
    const device = "device-token-eeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const first = await access.acquireModel(device, "session-a");
    expect(first.granted).toBe(true);
    await expect(access.acquireModel(device, "session-a")).resolves.toMatchObject({
      granted: false,
      reason: "session-busy"
    });
    if (first.granted) {
      await first.release();
      await first.release();
    }
    expect((await access.acquireModel(device, "session-a")).granted).toBe(true);
  });

  it("fails model access closed when configured Redis is unavailable", async () => {
    process.env.REDIS_URL = "redis://127.0.0.1:1";
    const access = new CompanionAccessService({
      configured: true,
      consumeRate: () => Promise.resolve(null),
      getDeviceUsage: () => Promise.resolve(null),
      acquireModel: () => Promise.resolve({ status: "unavailable" as const })
    } as never);
    await expect(
      access.acquireModel("device-token-ffffffffffffffffffffffffffffffff", "session-a")
    ).resolves.toMatchObject({
      granted: false,
      reason: "capacity-unavailable"
    });
    delete process.env.REDIS_URL;
  });

  it("uses the 15-call default when DEVICE budget env is unset", async () => {
    process.env.COMPANION_SESSION_MODEL_BUDGET_PER_DAY = "1";
    const access = new CompanionAccessService();
    const now = Date.UTC(2026, 7, 28, 8);
    const device = "device-token-gggggggggggggggggggggggggggggggg";
    const quota = await access.getDeviceQuota(device, now);
    expect(quota.limit).toBe(15);
  });
});
