import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type {
  GameSettlementRequest,
  PlayerStateResponse
} from "@wingedhorse/contracts";
import {
  INITIAL_PET_VITALS,
  consumeItem,
  grantItems,
  type HorseTypeId,
  type ItemId
} from "@wingedhorse/domain";
import { Pool, type PoolClient } from "pg";

interface StoredSession {
  id: string;
  typeId: HorseTypeId;
  startedAt: string;
  durationSeconds: 30;
  settled: boolean;
}

export interface SettlementResult {
  player: PlayerStateResponse;
  typeId: HorseTypeId;
  alreadySettled: boolean;
}

function initialPlayer(bootstrap?: Omit<PlayerStateResponse, "revision">): PlayerStateResponse {
  return bootstrap
    ? { ...bootstrap, revision: 0 }
    : {
        inventory: {},
        vitals: INITIAL_PET_VITALS,
        gamesPlayed: 0,
        relationshipXp: 0,
        revision: 0
      };
}

function rowToPlayer(row: Record<string, unknown>): PlayerStateResponse {
  return {
    inventory: (row.inventory ?? {}) as PlayerStateResponse["inventory"],
    vitals: row.vitals as PlayerStateResponse["vitals"],
    gamesPlayed: Number(row.games_played),
    relationshipXp: Number(row.relationship_xp),
    revision: Number(row.revision)
  };
}

@Injectable()
export class PlayerRepository implements OnModuleDestroy {
  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 8 })
    : null;
  private readonly players = new Map<string, PlayerStateResponse>();
  private readonly sessions = new Map<string, Map<string, StoredSession>>();

  private async lockedPlayer(client: PoolClient, actorHash: string) {
    const result = await client.query<Record<string, unknown>>(
      "SELECT * FROM player_states WHERE actor_hash = $1 FOR UPDATE",
      [actorHash]
    );
    if (!result.rows[0]) throw new Error("PLAYER_STATE_NOT_FOUND");
    return rowToPlayer(result.rows[0]);
  }

  async start(
    actorHash: string,
    sessionId: string,
    typeId: HorseTypeId,
    startedAt: string,
    bootstrap?: Omit<PlayerStateResponse, "revision">
  ): Promise<PlayerStateResponse> {
    if (!this.pool) {
      const player = this.players.get(actorHash) ?? initialPlayer(bootstrap);
      this.players.set(actorHash, player);
      const sessions = this.sessions.get(actorHash) ?? new Map<string, StoredSession>();
      sessions.set(sessionId, {
        id: sessionId,
        typeId,
        startedAt,
        durationSeconds: 30,
        settled: false
      });
      this.sessions.set(actorHash, sessions);
      return player;
    }
    const player = initialPlayer(bootstrap);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO player_states
          (actor_hash, inventory, vitals, games_played, relationship_xp, revision)
         VALUES ($1,$2::jsonb,$3::jsonb,$4,$5,0)
         ON CONFLICT (actor_hash) DO NOTHING`,
        [
          actorHash,
          JSON.stringify(player.inventory),
          JSON.stringify(player.vitals),
          player.gamesPlayed,
          player.relationshipXp
        ]
      );
      await client.query(
        `INSERT INTO game_sessions
          (actor_hash, session_id, type_id, started_at, duration_seconds)
         VALUES ($1,$2,$3,$4,30)`,
        [actorHash, sessionId, typeId, startedAt]
      );
      const stored = await this.lockedPlayer(client, actorHash);
      await client.query("COMMIT");
      return stored;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async get(actorHash: string): Promise<PlayerStateResponse | null> {
    if (!this.pool) return this.players.get(actorHash) ?? null;
    const result = await this.pool.query<Record<string, unknown>>(
      "SELECT * FROM player_states WHERE actor_hash = $1",
      [actorHash]
    );
    return result.rows[0] ? rowToPlayer(result.rows[0]) : null;
  }

  async settle(
    actorHash: string,
    sessionId: string,
    request: GameSettlementRequest,
    now: string
  ): Promise<SettlementResult> {
    if (!this.pool) {
      const session = this.sessions.get(actorHash)?.get(sessionId);
      if (!session) throw new Error("GAME_SESSION_NOT_FOUND");
      const player = this.players.get(actorHash);
      if (!player) throw new Error("PLAYER_STATE_NOT_FOUND");
      if (session.settled) return { player, typeId: session.typeId, alreadySettled: true };
      if (Date.parse(now) - Date.parse(session.startedAt) < 28_000)
        throw new Error("GAME_SESSION_TOO_EARLY");
      const next: PlayerStateResponse = {
        ...player,
        inventory: grantItems(player.inventory, request.caught),
        gamesPlayed: player.gamesPlayed + 1,
        relationshipXp: Math.min(999, player.relationshipXp + (player.gamesPlayed === 0 ? 8 : 2)),
        revision: player.revision + 1
      };
      session.settled = true;
      this.players.set(actorHash, next);
      return { player: next, typeId: session.typeId, alreadySettled: false };
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const sessionResult = await client.query<Record<string, unknown>>(
        `SELECT * FROM game_sessions
         WHERE actor_hash = $1 AND session_id = $2 FOR UPDATE`,
        [actorHash, sessionId]
      );
      const session = sessionResult.rows[0];
      if (!session) throw new Error("GAME_SESSION_NOT_FOUND");
      const player = await this.lockedPlayer(client, actorHash);
      if (session.settled_at) {
        await client.query("COMMIT");
        return {
          player,
          typeId: session.type_id as HorseTypeId,
          alreadySettled: true
        };
      }
      if (Date.parse(now) - Date.parse(String(session.started_at)) < 28_000)
        throw new Error("GAME_SESSION_TOO_EARLY");
      const next: PlayerStateResponse = {
        ...player,
        inventory: grantItems(player.inventory, request.caught),
        gamesPlayed: player.gamesPlayed + 1,
        relationshipXp: Math.min(999, player.relationshipXp + (player.gamesPlayed === 0 ? 8 : 2)),
        revision: player.revision + 1
      };
      await client.query(
        `UPDATE player_states SET inventory=$2::jsonb, games_played=$3,
          relationship_xp=$4, revision=$5, updated_at=NOW() WHERE actor_hash=$1`,
        [
          actorHash,
          JSON.stringify(next.inventory),
          next.gamesPlayed,
          next.relationshipXp,
          next.revision
        ]
      );
      await client.query(
        `UPDATE game_sessions SET settled_at=$3, settlement=$4::jsonb
         WHERE actor_hash=$1 AND session_id=$2`,
        [actorHash, sessionId, now, JSON.stringify(request)]
      );
      await client.query("COMMIT");
      return { player: next, typeId: session.type_id as HorseTypeId, alreadySettled: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async consume(actorHash: string, itemId: ItemId): Promise<PlayerStateResponse> {
    if (!this.pool) {
      const player = this.players.get(actorHash);
      if (!player) throw new Error("PLAYER_STATE_NOT_FOUND");
      const next = consumeItem(player.inventory, player.vitals, itemId);
      const updated = {
        ...player,
        inventory: next.inventory,
        vitals: next.vitals,
        relationshipXp: Math.min(999, player.relationshipXp + 2),
        revision: player.revision + 1
      };
      this.players.set(actorHash, updated);
      return updated;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const player = await this.lockedPlayer(client, actorHash);
      const consumed = consumeItem(player.inventory, player.vitals, itemId);
      const next: PlayerStateResponse = {
        ...player,
        inventory: consumed.inventory,
        vitals: consumed.vitals,
        relationshipXp: Math.min(999, player.relationshipXp + 2),
        revision: player.revision + 1
      };
      await client.query(
        `UPDATE player_states SET inventory=$2::jsonb, vitals=$3::jsonb,
          relationship_xp=$4, revision=$5, updated_at=NOW() WHERE actor_hash=$1`,
        [
          actorHash,
          JSON.stringify(next.inventory),
          JSON.stringify(next.vitals),
          next.relationshipXp,
          next.revision
        ]
      );
      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAll(actorHash: string): Promise<void> {
    if (!this.pool) {
      this.players.delete(actorHash);
      this.sessions.delete(actorHash);
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM game_sessions WHERE actor_hash=$1", [actorHash]);
      await client.query("DELETE FROM player_states WHERE actor_hash=$1", [actorHash]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
