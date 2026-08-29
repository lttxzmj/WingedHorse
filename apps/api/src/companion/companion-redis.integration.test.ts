import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CompanionAccessService } from "./companion-access.service.js";
import { CompanionRedisStore } from "./companion-redis.store.js";

const describeRedis = process.env.REDIS_TEST_URL ? describe : describe.skip;
const stores: CompanionRedisStore[] = [];
const previous = new Map<string, string | undefined>();

describeRedis("CompanionAccessService Redis integration", () => {
  beforeAll(() => {
    for (const key of [
      "REDIS_URL",
      "COMPANION_FINGERPRINT_SECRET",
      "COMPANION_IP_RATE_LIMIT_PER_MINUTE",
      "COMPANION_SESSION_RATE_LIMIT_PER_MINUTE",
      "COMPANION_DEVICE_MODEL_BUDGET_PER_DAY",
      "COMPANION_SESSION_MODEL_BUDGET_PER_DAY",
      "COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY"
    ])
      previous.set(key, process.env[key]);
    process.env.REDIS_URL = process.env.REDIS_TEST_URL;
    process.env.COMPANION_FINGERPRINT_SECRET = `integration-${randomUUID()}-shared-secret`;
    process.env.COMPANION_IP_RATE_LIMIT_PER_MINUTE = "20";
    process.env.COMPANION_SESSION_RATE_LIMIT_PER_MINUTE = "1";
    process.env.COMPANION_DEVICE_MODEL_BUDGET_PER_DAY = "1";
    process.env.COMPANION_GLOBAL_MODEL_BUDGET_PER_DAY = "100";
  });

  afterAll(async () => {
    await Promise.all(stores.map((store) => store.onModuleDestroy()));
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function access() {
    const store = new CompanionRedisStore();
    stores.push(store);
    return new CompanionAccessService(store);
  }

  it("shares request limits across API instances", async () => {
    const first = access();
    const second = access();
    const session = `rate-${randomUUID()}`;
    expect((await first.checkRequest("203.0.113.9", session)).allowed).toBe(true);
    expect((await second.checkRequest("198.51.100.4", session)).allowed).toBe(false);
  });

  it("shares device budgets and active locks across API instances", async () => {
    const first = access();
    const second = access();
    const device = `device-${randomUUID().replaceAll("-", "")}`;
    const session = `model-${randomUUID()}`;
    const acquired = await first.acquireModel(device, session);
    expect(acquired.granted).toBe(true);
    await expect(second.acquireModel(device, session)).resolves.toMatchObject({
      granted: false,
      reason: "session-busy"
    });
    if (acquired.granted) await acquired.release();
    await expect(second.acquireModel(device, `model-${randomUUID()}`)).resolves.toMatchObject({
      granted: false,
      reason: "device-budget"
    });
  });
});
