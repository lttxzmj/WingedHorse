import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { AnalyticsEventPayload } from "@wingedhorse/contracts";
import { visitorTokenSchema } from "@wingedhorse/contracts";
import { createHash } from "node:crypto";
import { Pool } from "pg";

const MEMORY_CAP = 10_000;

export interface StoredAnalyticsEvent {
  name: AnalyticsEventPayload["name"];
  occurredAt: string;
  props: Record<string, string | number | boolean>;
  visitorHash: string | null;
}

export interface StoredPurchaseIntent {
  contact: string;
  visitorHash: string | null;
  createdAt: string;
}

function hashVisitor(token: string | undefined): string | null {
  const parsed = visitorTokenSchema.safeParse(token);
  if (!parsed.success) return null;
  return createHash("sha256").update(parsed.data).digest("hex");
}

@Injectable()
export class AnalyticsRepository implements OnModuleDestroy {
  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 4 })
    : null;
  private readonly events: StoredAnalyticsEvent[] = [];
  private readonly intents: StoredPurchaseIntent[] = [];

  async recordEvent(payload: AnalyticsEventPayload, visitorToken?: string): Promise<void> {
    const visitorHash = hashVisitor(visitorToken);
    const props = payload.props ?? {};
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO analytics_events (name, occurred_at, props, visitor_hash)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [payload.name, payload.occurredAt, JSON.stringify(props), visitorHash]
      );
      return;
    }
    this.events.push({
      name: payload.name,
      occurredAt: payload.occurredAt,
      props,
      visitorHash
    });
    if (this.events.length > MEMORY_CAP) this.events.shift();
  }

  async recordIntent(contact: string, visitorToken?: string): Promise<void> {
    const visitorHash = hashVisitor(visitorToken);
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO purchase_intents (contact, visitor_hash) VALUES ($1, $2)`,
        [contact, visitorHash]
      );
      return;
    }
    this.intents.push({
      contact,
      visitorHash,
      createdAt: new Date().toISOString()
    });
    if (this.intents.length > MEMORY_CAP) this.intents.shift();
  }

  /** Test helper: inspect in-memory events when PostgreSQL is not configured. */
  listEvents(): readonly StoredAnalyticsEvent[] {
    return this.events;
  }

  /** Test helper: inspect in-memory intents when PostgreSQL is not configured. */
  listIntents(): readonly StoredPurchaseIntent[] {
    return this.intents;
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
