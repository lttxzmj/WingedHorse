import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LifeRepository } from "./life.repository.js";
import { LifeService } from "./life.service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(databaseUrl))("LifeRepository PostgreSQL integration", () => {
  let admin: Pool;
  let repository: LifeRepository;
  let service: LifeService;
  let previousDatabaseUrl: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    admin = new Pool({ connectionString: databaseUrl });
    for (const file of [
      "001_life_events.sql",
      "002_life_events_metadata.sql",
      "003_life_story_visitors.sql"
    ]) {
      const migration = await readFile(
        new URL(`../../../../deploy/migrations/${file}`, import.meta.url),
        "utf8"
      );
      await admin.query(migration);
    }
    await admin.query("TRUNCATE life_events, digital_life_plans");
    repository = new LifeRepository();
    service = new LifeService(repository);
  });

  afterAll(async () => {
    await repository?.onModuleDestroy();
    await admin?.query("TRUNCATE life_events, digital_life_plans");
    await admin?.end();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it("persists an isolated event and updates its interaction", async () => {
    const token = "p".repeat(43);
    const otherToken = "q".repeat(43);
    const event = await service.create(token, {
      eventKey: "postgres:arrival",
      kind: "arrival",
      occurredAt: "2026-08-28T12:00:00.000Z",
      typeId: "chosen"
    });
    await service.interact(token, event.id, { interaction: "liked", value: true });

    expect((await service.list(token)).events[0]).toMatchObject({
      eventKey: "postgres:arrival",
      liked: true
    });
    expect((await service.list(otherToken)).events).toEqual([]);
  });
});
