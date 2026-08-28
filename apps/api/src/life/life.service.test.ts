import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LifeRepository } from "./life.repository.js";
import { LifeService } from "./life.service.js";

const tokenA = "a".repeat(43);
const tokenB = "b".repeat(43);

describe("LifeService visitor isolation", () => {
  let repository: LifeRepository;
  let service: LifeService;
  let previousDatabaseUrl: string | undefined;

  beforeEach(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    repository = new LifeRepository();
    service = new LifeService(repository);
  });

  afterEach(async () => {
    await repository.onModuleDestroy();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it("stores only a hash of the visitor capability", () => {
    expect(service.actorHash(tokenA)).toHaveLength(64);
    expect(service.actorHash(tokenA)).not.toContain(tokenA);
    expect(service.actorHash(tokenA)).not.toBe(service.actorHash(tokenB));
  });

  it("deduplicates retries and isolates another visitor", async () => {
    const request = {
      eventKey: "arrival:2.1.0:chosen",
      kind: "arrival" as const,
      occurredAt: "2026-08-28T10:00:00.000Z",
      typeId: "chosen" as const
    };
    const first = await service.create(tokenA, request);
    const retry = await service.create(tokenA, request);
    expect(retry).toEqual(first);
    expect((await service.list(tokenA)).events).toHaveLength(1);
    expect((await service.list(tokenB)).events).toHaveLength(0);
  });

  it("paginates, scopes interactions and deletes only the current visitor", async () => {
    const older = await service.create(tokenA, {
      eventKey: "quiet:one",
      kind: "quiet-moment",
      occurredAt: "2026-08-28T10:00:00.000Z",
      typeId: "saving"
    });
    await service.create(tokenA, {
      eventKey: "quiet:two",
      kind: "quiet-moment",
      occurredAt: "2026-08-28T11:00:00.000Z",
      typeId: "saving"
    });
    await service.create(tokenB, {
      eventKey: "quiet:other",
      kind: "quiet-moment",
      occurredAt: "2026-08-28T12:00:00.000Z",
      typeId: "tired"
    });

    const firstPage = await service.list(tokenA, undefined, 1);
    expect(firstPage.events[0]?.eventKey).toBe("quiet:two");
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await service.list(tokenA, firstPage.nextCursor!, 1);
    expect(secondPage.events[0]?.id).toBe(older.id);

    await service.interact(tokenA, older.id, { interaction: "saved", value: true });
    await expect(
      service.interact(tokenB, older.id, { interaction: "saved", value: true })
    ).rejects.toMatchObject({ status: 404 });

    expect(await service.deleteAll(tokenA)).toEqual({ deleted: 2 });
    expect((await service.list(tokenA)).events).toHaveLength(0);
    expect((await service.list(tokenB)).events).toHaveLength(1);
  });
});
