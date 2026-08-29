import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { DailyPlan, LifeEvent } from "@wingedhorse/domain";
import { createPostgresPool } from "../database/postgres.js";

interface Cursor {
  occurredAt: string;
  id: string;
}

export interface LifeEventPage {
  events: LifeEvent[];
  nextCursor: string | null;
}

function encodeCursor(event: LifeEvent): string {
  return Buffer.from(JSON.stringify({ occurredAt: event.occurredAt, id: event.id })).toString(
    "base64url"
  );
}

function decodeCursor(value?: string): Cursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "occurredAt" in parsed &&
      "id" in parsed &&
      typeof parsed.occurredAt === "string" &&
      typeof parsed.id === "string" &&
      Number.isFinite(Date.parse(parsed.occurredAt))
    )
      return { occurredAt: parsed.occurredAt, id: parsed.id };
  } catch {
    return undefined;
  }
  return undefined;
}

function rowToEvent(row: Record<string, unknown>): LifeEvent {
  return {
    id: String(row.event_id),
    eventKey: String(row.event_key),
    kind: row.kind as LifeEvent["kind"],
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
    title: String(row.title),
    body: String(row.body),
    typeId: row.type_id as LifeEvent["typeId"],
    ...(row.item_id ? { itemId: row.item_id as NonNullable<LifeEvent["itemId"]> } : {}),
    ...(row.activity ? { activity: row.activity as NonNullable<LifeEvent["activity"]> } : {}),
    ...(row.motive ? { motive: row.motive as NonNullable<LifeEvent["motive"]> } : {}),
    ...(row.visitor_type_id
      ? { visitorTypeId: row.visitor_type_id as NonNullable<LifeEvent["visitorTypeId"]> }
      : {}),
    ...(row.story_chapter
      ? { storyChapter: Number(row.story_chapter) as NonNullable<LifeEvent["storyChapter"]> }
      : {}),
    source:
      row.source === "daily-plan"
        ? "daily-plan"
        : row.source === "life-engine"
          ? "life-engine"
          : "user-action",
    liked: Boolean(row.liked),
    saved: Boolean(row.saved)
  };
}

@Injectable()
export class LifeRepository implements OnModuleDestroy {
  private readonly pool = createPostgresPool(4);
  private readonly memory = new Map<string, Map<string, LifeEvent>>();
  private readonly memoryPlans = new Map<string, DailyPlan>();

  get persistent(): boolean {
    return this.pool !== null;
  }

  async upsert(actorHash: string, event: LifeEvent): Promise<LifeEvent> {
    if (!this.pool) {
      const events = this.memory.get(actorHash) ?? new Map<string, LifeEvent>();
      const existing = [...events.values()].find((item) => item.eventKey === event.eventKey);
      if (existing) return existing;
      events.set(event.id, event);
      this.memory.set(actorHash, events);
      return event;
    }
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO life_events
        (actor_hash, event_id, event_key, kind, occurred_at, title, body, type_id, item_id, activity, motive, visitor_type_id, story_chapter, source, liked, saved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (actor_hash, event_key) DO UPDATE SET event_key = EXCLUDED.event_key
       RETURNING *`,
      [
        actorHash,
        event.id,
        event.eventKey,
        event.kind,
        event.occurredAt,
        event.title,
        event.body,
        event.typeId,
        event.itemId ?? null,
        event.activity ?? null,
        event.motive ?? null,
        event.visitorTypeId ?? null,
        event.storyChapter ?? null,
        event.source,
        event.liked,
        event.saved
      ]
    );
    return rowToEvent(result.rows[0]!);
  }

  async list(actorHash: string, cursorValue?: string, limit = 20): Promise<LifeEventPage> {
    const cursor = decodeCursor(cursorValue);
    if (cursorValue && !cursor) throw new Error("INVALID_CURSOR");
    if (!this.pool) {
      const all = [...(this.memory.get(actorHash)?.values() ?? [])].sort(
        (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id)
      );
      const start = cursor
        ? all.findIndex(
            (event) =>
              event.occurredAt < cursor.occurredAt ||
              (event.occurredAt === cursor.occurredAt && event.id < cursor.id)
          )
        : 0;
      const events = start < 0 ? [] : all.slice(start, start + limit);
      return {
        events,
        nextCursor: events.length === limit ? encodeCursor(events[events.length - 1]!) : null
      };
    }
    const values: unknown[] = [actorHash, limit];
    const where = cursor ? "AND (occurred_at, event_id) < ($3::timestamptz, $4::text)" : "";
    if (cursor) values.push(cursor.occurredAt, cursor.id);
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM life_events WHERE actor_hash = $1 ${where}
       ORDER BY occurred_at DESC, event_id DESC LIMIT $2`,
      values
    );
    const events = result.rows.map(rowToEvent);
    return {
      events,
      nextCursor: events.length === limit ? encodeCursor(events[events.length - 1]!) : null
    };
  }

  async setInteraction(
    actorHash: string,
    id: string,
    interaction: "liked" | "saved",
    value: boolean
  ): Promise<LifeEvent | null> {
    if (!this.pool) {
      const events = this.memory.get(actorHash);
      const event = events?.get(id);
      if (!event) return null;
      const updated = { ...event, [interaction]: value };
      events!.set(id, updated);
      return updated;
    }
    const column = interaction === "liked" ? "liked" : "saved";
    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE life_events SET ${column} = $3, updated_at = NOW()
       WHERE actor_hash = $1 AND event_id = $2 RETURNING *`,
      [actorHash, id, value]
    );
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }

  async loadPlan(actorHash: string): Promise<DailyPlan | undefined> {
    if (!this.pool) return this.memoryPlans.get(actorHash);
    const result = await this.pool.query<{ plan: DailyPlan }>(
      "SELECT plan FROM digital_life_plans WHERE actor_hash = $1",
      [actorHash]
    );
    return result.rows[0]?.plan;
  }

  async savePlan(actorHash: string, plan: DailyPlan): Promise<void> {
    if (!this.pool) {
      this.memoryPlans.set(actorHash, plan);
      return;
    }
    await this.pool.query(
      `INSERT INTO digital_life_plans (actor_hash, plan, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (actor_hash)
       DO UPDATE SET plan = EXCLUDED.plan, updated_at = EXCLUDED.updated_at`,
      [actorHash, JSON.stringify(plan)]
    );
  }

  async deleteAll(actorHash: string): Promise<number> {
    if (!this.pool) {
      const count = this.memory.get(actorHash)?.size ?? 0;
      this.memory.delete(actorHash);
      this.memoryPlans.delete(actorHash);
      return count;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("DELETE FROM life_events WHERE actor_hash = $1", [
        actorHash
      ]);
      await client.query("DELETE FROM digital_life_plans WHERE actor_hash = $1", [actorHash]);
      await client.query("COMMIT");
      return result.rowCount ?? 0;
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
