import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  LifeEventCreateRequest,
  LifeEventInteractionRequest,
  LifeEventListResponse,
  LifeEventResponse,
  LifeEventVisibilityUpdateRequest,
  LifeSyncRequest,
  LifeSyncResponse
} from "@wingedhorse/contracts";
import { advanceDigitalLife, createLifeEvent } from "@wingedhorse/domain";
import type { LifeEventKind } from "@wingedhorse/domain";
import { createHash } from "node:crypto";
import { LifeRepository } from "./life.repository.js";

type UserActionEventKind = "arrival" | "game-haul" | "gift" | "quiet-moment";

function isUserActionEventKind(kind: LifeEventKind): kind is UserActionEventKind {
  return kind === "arrival" || kind === "game-haul" || kind === "gift" || kind === "quiet-moment";
}

@Injectable()
export class LifeService {
  constructor(@Inject(LifeRepository) private readonly repository: LifeRepository) {}

  actorHash(visitorToken: string): string {
    return createHash("sha256").update(visitorToken).digest("hex");
  }

  async create(visitorToken: string, request: LifeEventCreateRequest): Promise<LifeEventResponse> {
    const event = createLifeEvent({ ...request, source: "user-action" });
    const stored = await this.repository.upsert(this.actorHash(visitorToken), event);
    if (event.visibility === stored.visibility) return stored;
    return this.setVisibility(visitorToken, stored.id, { visibility: event.visibility });
  }

  list(visitorToken: string, cursor?: string, limit = 20): Promise<LifeEventListResponse> {
    return this.repository.list(this.actorHash(visitorToken), cursor, limit);
  }

  async interact(
    visitorToken: string,
    id: string,
    request: LifeEventInteractionRequest
  ): Promise<LifeEventResponse> {
    const event = await this.repository.setInteraction(
      this.actorHash(visitorToken),
      id,
      request.interaction,
      request.value
    );
    if (!event)
      throw new NotFoundException({
        code: "LIFE_EVENT_NOT_FOUND",
        message: "没有找到这条生活记录"
      });
    return event;
  }

  async setVisibility(
    visitorToken: string,
    id: string,
    request: LifeEventVisibilityUpdateRequest
  ): Promise<LifeEventResponse> {
    const event = await this.repository.setVisibility(
      this.actorHash(visitorToken),
      id,
      request.visibility
    );
    if (!event)
      throw new NotFoundException({
        code: "LIFE_EVENT_NOT_FOUND",
        message: "没有找到这条生活记录"
      });
    return event;
  }

  async sync(
    visitorToken: string,
    request: LifeSyncRequest,
    now = new Date().toISOString()
  ): Promise<LifeSyncResponse> {
    const actorHash = this.actorHash(visitorToken);
    for (const event of request.clientEvents) {
      if (event.source !== "user-action") continue;
      if (!isUserActionEventKind(event.kind)) continue;
      const canonical = createLifeEvent({
        eventKey: event.eventKey,
        kind: event.kind,
        occurredAt: event.occurredAt,
        typeId: event.typeId,
        ...(event.itemId ? { itemId: event.itemId } : {}),
        source: "user-action",
        visibility: event.visibility === "friends" ? "friends" : "private"
      });
      const stored = await this.repository.upsert(actorHash, canonical);
      if (stored.visibility !== canonical.visibility)
        await this.repository.setVisibility(actorHash, stored.id, canonical.visibility);
      if (stored.liked !== event.liked)
        await this.repository.setInteraction(actorHash, stored.id, "liked", event.liked);
      if (stored.saved !== event.saved)
        await this.repository.setInteraction(actorHash, stored.id, "saved", event.saved);
    }
    const [{ events }, previousPlan] = await Promise.all([
      this.repository.list(actorHash, undefined, 30),
      this.repository.loadPlan(actorHash)
    ]);
    const next = advanceDigitalLife({
      visitorId: actorHash,
      typeId: request.typeId,
      now,
      timezoneOffsetMinutes: request.timezoneOffsetMinutes,
      vitals: request.vitals,
      relationshipXp: request.relationshipXp,
      events,
      ...(previousPlan ? { previousPlan } : {})
    });
    await Promise.all([
      this.repository.savePlan(actorHash, next.plan),
      ...next.generatedEvents.map((event) => this.repository.upsert(actorHash, event))
    ]);
    const page = await this.repository.list(actorHash, undefined, 30);
    return {
      typeId: request.typeId,
      world: next.world,
      plan: next.plan,
      events: page.events,
      generatedEventIds: next.generatedEvents.map((event) => event.id)
    };
  }

  async deleteAll(visitorToken: string) {
    const deleted = await this.repository.deleteAll(this.actorHash(visitorToken));
    return { deleted };
  }
}
