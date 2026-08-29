import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { DEFAULT_FRIEND_LIMITS, friendshipActorPair } from "@wingedhorse/domain";
import { createPostgresPool } from "../database/postgres.js";

export interface VisitorProfile {
  actorHash: string;
  inviteCode: string;
  displayName: string | null;
}

export interface FriendRecord {
  inviteCode: string;
  nickname: string;
  since: string;
}

@Injectable()
export class FriendsRepository implements OnModuleDestroy {
  private readonly pool = createPostgresPool(4);
  private readonly profilesByHash = new Map<string, VisitorProfile>();
  private readonly profilesByCode = new Map<string, VisitorProfile>();
  private readonly friendships = new Map<string, { low: string; high: string; since: string }>();

  get persistent(): boolean {
    return this.pool !== null;
  }

  async register(
    actorHash: string,
    inviteCode: string,
    displayName?: string
  ): Promise<VisitorProfile> {
    const name = displayName?.trim() ? displayName.trim().slice(0, 24) : null;
    if (!this.pool) {
      const taken = this.profilesByCode.get(inviteCode);
      if (taken && taken.actorHash !== actorHash) {
        throw new Error("INVITE_CODE_TAKEN");
      }
      const previous = this.profilesByHash.get(actorHash);
      if (previous) this.profilesByCode.delete(previous.inviteCode);
      const profile: VisitorProfile = {
        actorHash,
        inviteCode,
        displayName: name ?? previous?.displayName ?? null
      };
      this.profilesByHash.set(actorHash, profile);
      this.profilesByCode.set(inviteCode, profile);
      return profile;
    }
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `INSERT INTO visitor_profiles (actor_hash, invite_code, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (actor_hash) DO UPDATE SET
           invite_code = EXCLUDED.invite_code,
           display_name = COALESCE(EXCLUDED.display_name, visitor_profiles.display_name),
           updated_at = NOW()
         RETURNING *`,
        [actorHash, inviteCode, name]
      );
      return rowToProfile(result.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("INVITE_CODE_TAKEN", { cause: error });
      throw error;
    }
  }

  async findByInviteCode(inviteCode: string): Promise<VisitorProfile | null> {
    if (!this.pool) return this.profilesByCode.get(inviteCode) ?? null;
    const result = await this.pool.query<Record<string, unknown>>(
      "SELECT * FROM visitor_profiles WHERE invite_code = $1",
      [inviteCode]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async findByActorHash(actorHash: string): Promise<VisitorProfile | null> {
    if (!this.pool) return this.profilesByHash.get(actorHash) ?? null;
    const result = await this.pool.query<Record<string, unknown>>(
      "SELECT * FROM visitor_profiles WHERE actor_hash = $1",
      [actorHash]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async countFriends(actorHash: string): Promise<number> {
    if (!this.pool) {
      return [...this.friendships.values()].filter(
        (edge) => edge.low === actorHash || edge.high === actorHash
      ).length;
    }
    const result = await this.pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM friendships
       WHERE actor_low = $1 OR actor_high = $1`,
      [actorHash]
    );
    return Number(result.rows[0]?.n ?? 0);
  }

  async areFriends(actorA: string, actorB: string): Promise<boolean> {
    if (actorA === actorB) return false;
    const [low, high] = friendshipActorPair(actorA, actorB);
    if (!this.pool) return this.friendships.has(`${low}:${high}`);
    const result = await this.pool.query(
      "SELECT 1 FROM friendships WHERE actor_low = $1 AND actor_high = $2",
      [low, high]
    );
    return Boolean(result.rows[0]);
  }

  async addFriendship(actorA: string, actorB: string): Promise<"ok" | "exists" | "full"> {
    if (actorA === actorB) throw new Error("SELF_INVITE");
    const [low, high] = friendshipActorPair(actorA, actorB);
    const [countA, countB, exists] = await Promise.all([
      this.countFriends(actorA),
      this.countFriends(actorB),
      this.areFriends(actorA, actorB)
    ]);
    if (exists) return "exists";
    if (countA >= DEFAULT_FRIEND_LIMITS.maxFriends || countB >= DEFAULT_FRIEND_LIMITS.maxFriends) {
      return "full";
    }
    const since = new Date().toISOString();
    if (!this.pool) {
      this.friendships.set(`${low}:${high}`, { low, high, since });
      return "ok";
    }
    await this.pool.query(
      `INSERT INTO friendships (actor_low, actor_high)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [low, high]
    );
    return "ok";
  }

  async removeFriendship(actorA: string, actorB: string): Promise<boolean> {
    if (actorA === actorB) return false;
    const [low, high] = friendshipActorPair(actorA, actorB);
    if (!this.pool) return this.friendships.delete(`${low}:${high}`);
    const result = await this.pool.query(
      "DELETE FROM friendships WHERE actor_low = $1 AND actor_high = $2",
      [low, high]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listFriends(actorHash: string): Promise<FriendRecord[]> {
    if (!this.pool) {
      const records: FriendRecord[] = [];
      for (const edge of this.friendships.values()) {
        const other =
          edge.low === actorHash ? edge.high : edge.high === actorHash ? edge.low : null;
        if (!other) continue;
        const profile = this.profilesByHash.get(other);
        if (!profile) continue;
        records.push({
          inviteCode: profile.inviteCode,
          nickname: profile.displayName?.trim() || "新朋友",
          since: edge.since
        });
      }
      return records.sort((a, b) => b.since.localeCompare(a.since));
    }
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT p.invite_code, p.display_name, f.created_at
       FROM friendships f
       JOIN visitor_profiles p
         ON p.actor_hash = CASE WHEN f.actor_low = $1 THEN f.actor_high ELSE f.actor_low END
       WHERE f.actor_low = $1 OR f.actor_high = $1
       ORDER BY f.created_at DESC`,
      [actorHash]
    );
    return result.rows.map((row) => ({
      inviteCode: String(row.invite_code),
      nickname: (typeof row.display_name === "string" ? row.display_name.trim() : "") || "新朋友",
      since: new Date(String(row.created_at)).toISOString()
    }));
  }

  async deleteAll(actorHash: string): Promise<void> {
    if (!this.pool) {
      const profile = this.profilesByHash.get(actorHash);
      if (profile) this.profilesByCode.delete(profile.inviteCode);
      this.profilesByHash.delete(actorHash);
      for (const [key, edge] of this.friendships) {
        if (edge.low === actorHash || edge.high === actorHash) this.friendships.delete(key);
      }
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM friendships WHERE actor_low = $1 OR actor_high = $1", [
        actorHash
      ]);
      await client.query("DELETE FROM visitor_profiles WHERE actor_hash = $1", [actorHash]);
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

function rowToProfile(row: Record<string, unknown>): VisitorProfile {
  const displayName = typeof row.display_name === "string" ? row.display_name.trim() : null;
  return {
    actorHash: String(row.actor_hash),
    inviteCode: String(row.invite_code),
    displayName: displayName || null
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
