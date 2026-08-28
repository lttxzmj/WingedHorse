import { describe, expect, it } from "vitest";
import { PlayerRepository } from "./player.repository.js";
import { PlayerService } from "./player.service.js";

const token = "G".repeat(43);
const bootstrap = {
  inventory: {},
  vitals: { energy: 50, engine: 50, chaos: 50, direction: 50 },
  gamesPlayed: 0,
  relationshipXp: 0
};

describe("PlayerService", () => {
  it("settles one server-issued session exactly once", async () => {
    const service = new PlayerService(new PlayerRepository());
    const session = await service.start(
      token,
      { typeId: "chosen", bootstrap },
      "2026-08-28T10:00:00.000Z"
    );
    const first = await service.settle(
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
    expect(first).toMatchObject({ alreadySettled: false });
    expect(first.player.inventory).toEqual({ "iced-americano": 1 });
    expect(first.player.gamesPlayed).toBe(1);
    expect(retry).toMatchObject({ alreadySettled: true });
    expect(retry.player.inventory).toEqual({ "iced-americano": 1 });
  });

  it("returns the same active session instead of issuing parallel reward claims", async () => {
    const service = new PlayerService(new PlayerRepository());
    const first = await service.start(
      token,
      { typeId: "chosen", bootstrap },
      "2026-08-28T10:00:00.000Z"
    );
    const retry = await service.start(
      token,
      { typeId: "chosen", bootstrap },
      "2026-08-28T10:00:03.000Z"
    );
    expect(retry.sessionId).toBe(first.sessionId);
    expect(retry.startedAt).toBe(first.startedAt);
  });

  it("rejects early, impossible and non-drop settlements", async () => {
    const service = new PlayerService(new PlayerRepository());
    const early = await service.start(
      token,
      { typeId: "chosen", bootstrap },
      "2026-08-28T10:00:00.000Z"
    );
    await expect(
      service.settle(
        token,
        early.sessionId,
        { score: 10, caught: { "iced-americano": 1 } },
        "2026-08-28T10:00:05.000Z"
      )
    ).rejects.toMatchObject({ response: { code: "GAME_SESSION_TOO_EARLY" } });
    await expect(
      service.settle(
        token,
        early.sessionId,
        { score: 1000, caught: { "iced-americano": 1 } },
        "2026-08-28T10:00:30.000Z"
      )
    ).rejects.toMatchObject({ response: { code: "INVALID_GAME_SCORE" } });
    await expect(
      service.settle(
        token,
        early.sessionId,
        { score: 0, caught: { "sponsored-coffee-coupon": 1 } },
        "2026-08-28T10:00:30.000Z"
      )
    ).rejects.toMatchObject({ response: { code: "INVALID_GAME_REWARD" } });
  });

  it("consumes inventory transactionally and isolates anonymous actors", async () => {
    const service = new PlayerService(new PlayerRepository());
    const session = await service.start(
      token,
      { typeId: "chosen", bootstrap },
      "2026-08-28T10:00:00.000Z"
    );
    await service.settle(
      token,
      session.sessionId,
      { score: 10, caught: { "iced-americano": 1 } },
      "2026-08-28T10:00:30.000Z"
    );
    const consumed = await service.consume(token, { itemId: "iced-americano" });
    expect(consumed.inventory).toEqual({});
    expect(consumed.vitals.energy).toBe(58);
    expect(consumed.relationshipXp).toBe(10);
    await expect(service.state("H".repeat(43))).rejects.toMatchObject({
      response: { code: "PLAYER_STATE_NOT_FOUND" }
    });
  });

  it("removes player state and sessions through account deletion", async () => {
    const service = new PlayerService(new PlayerRepository());
    await service.start(token, { typeId: "saving", bootstrap });
    await service.deleteAll(token);

    await expect(service.state(token)).rejects.toMatchObject({
      response: { code: "PLAYER_STATE_NOT_FOUND" }
    });
  });
});
