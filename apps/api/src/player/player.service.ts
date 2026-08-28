import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ConsumePlayerItemRequest,
  GameSessionStartRequest,
  GameSettlementRequest
} from "@wingedhorse/contracts";
import { createHash, randomBytes } from "node:crypto";
import { PlayerRepository } from "./player.repository.js";

@Injectable()
export class PlayerService {
  constructor(@Inject(PlayerRepository) private readonly repository: PlayerRepository) {}

  actorHash(visitorToken: string) {
    return createHash("sha256").update(visitorToken).digest("hex");
  }

  async start(visitorToken: string, request: GameSessionStartRequest, now = new Date().toISOString()) {
    const sessionId = randomBytes(24).toString("base64url");
    const player = await this.repository.start(
      this.actorHash(visitorToken),
      sessionId,
      request.typeId,
      now,
      request.bootstrap
    );
    return { sessionId, startedAt: now, durationSeconds: 30 as const, player };
  }

  async state(visitorToken: string) {
    const player = await this.repository.get(this.actorHash(visitorToken));
    if (!player)
      throw new NotFoundException({ code: "PLAYER_STATE_NOT_FOUND", message: "还没有云端养成状态" });
    return player;
  }

  async settle(
    visitorToken: string,
    sessionId: string,
    request: GameSettlementRequest,
    now = new Date().toISOString()
  ) {
    try {
      const result = await this.repository.settle(
        this.actorHash(visitorToken),
        sessionId,
        request,
        now
      );
      return { sessionId, alreadySettled: result.alreadySettled, player: result.player };
    } catch (error) {
      if (error instanceof Error && error.message === "GAME_SESSION_NOT_FOUND")
        throw new NotFoundException({ code: error.message, message: "没有找到这局补给雨" });
      if (error instanceof Error && error.message === "GAME_SESSION_TOO_EARLY")
        throw new BadRequestException({ code: error.message, message: "这局游戏还没有结束" });
      throw error;
    }
  }

  async consume(visitorToken: string, request: ConsumePlayerItemRequest) {
    try {
      return await this.repository.consume(this.actorHash(visitorToken), request.itemId);
    } catch (error) {
      if (
        error instanceof Error &&
        ["PLAYER_STATE_NOT_FOUND", "ITEM_NOT_OWNED", "ITEM_NOT_CONSUMABLE"].includes(error.message)
      )
        throw new BadRequestException({ code: error.message, message: "现在不能使用这件物品" });
      throw error;
    }
  }

  deleteAll(visitorToken: string) {
    return this.repository.deleteAll(this.actorHash(visitorToken));
  }
}
