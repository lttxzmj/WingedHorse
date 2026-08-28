import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  LifeEventCreateRequest,
  LifeEventInteractionRequest,
  LifeEventListResponse,
  LifeEventResponse
} from "@wingedhorse/contracts";
import { createLifeEvent } from "@wingedhorse/domain";
import { createHash } from "node:crypto";
import { LifeRepository } from "./life.repository.js";

@Injectable()
export class LifeService {
  constructor(@Inject(LifeRepository) private readonly repository: LifeRepository) {}

  actorHash(visitorToken: string): string {
    return createHash("sha256").update(visitorToken).digest("hex");
  }

  create(visitorToken: string, request: LifeEventCreateRequest): Promise<LifeEventResponse> {
    const event = createLifeEvent(request);
    return this.repository.upsert(this.actorHash(visitorToken), event);
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

  async deleteAll(visitorToken: string) {
    const deleted = await this.repository.deleteAll(this.actorHash(visitorToken));
    return { deleted };
  }
}
