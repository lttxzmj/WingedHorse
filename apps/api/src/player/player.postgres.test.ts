import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PlayerRepository } from "./player.repository.js";
import { PlayerService } from "./player.service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(databaseUrl))("PlayerRepository PostgreSQL integration", () => {
  let admin: Pool;
  let repository: PlayerRepository;
  let service: PlayerService;
  let previousDatabaseUrl: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    admin = new Pool({ connectionString: databaseUrl });
    for (const file of [
      "001_life_events.sql",
      "002_life_events_metadata.sql",
      "003_life_story_visitors.sql",
      "004_player_game_state.sql"
    ]) {
      const migration = await readFile(
        new URL(`../../../../deploy/migrations/${file}`, import.meta.url),
        "utf8"
      );
      await admin.query(migration);
    }
    await admin.query("TRUNCATE game_sessions, player_states");
    repository = new PlayerRepository();
    service = new PlayerService(repository);
  });

  afterAll(async () => {
    await repository?.onModuleDestroy();
    await admin?.query("TRUNCATE game_sessions, player_states");
    await admin?.end();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it("commits settlement and consumption once under row locks", async () => {
    const token = "P".repeat(43);
    const session = await service.start(token, { typeId: "chosen" }, "2026-08-28T10:00:00.000Z");
    const settlement = await service.settle(
      token,
      session.sessionId,
      { score: 10, caught: { "iced-americano": 1 } },
      "2026-08-28T10:00:30.000Z"
    );
    const retry = await service.settle(
      token,
      session.sessionId,
      { score: 10, caught: { "iced-americano": 1 } },
      "2026-08-28T10:00:31.000Z"
    );
    expect(settlement.player.inventory).toEqual({ "iced-americano": 1 });
    expect(retry.alreadySettled).toBe(true);
    expect(retry.player.gamesPlayed).toBe(1);
    expect((await service.consume(token, { itemId: "iced-americano" })).inventory).toEqual({});
  });
});
