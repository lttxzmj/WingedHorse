import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  FriendAcceptRequest,
  FriendFeedEvent,
  FriendFeedResponse,
  FriendListResponse,
  FriendRegisterRequest
} from "@wingedhorse/contracts";
import { parseInviteCode, type LifeEvent } from "@wingedhorse/domain";
import { createHash } from "node:crypto";
import { LifeRepository } from "../life/life.repository.js";
import { FriendsRepository } from "./friends.repository.js";

@Injectable()
export class FriendsService {
  constructor(
    @Inject(FriendsRepository) private readonly friends: FriendsRepository,
    @Inject(LifeRepository) private readonly life: LifeRepository
  ) {}

  actorHash(visitorToken: string): string {
    return createHash("sha256").update(visitorToken).digest("hex");
  }

  async register(visitorToken: string, request: FriendRegisterRequest) {
    try {
      const profile = await this.friends.register(
        this.actorHash(visitorToken),
        request.inviteCode,
        request.displayName
      );
      return { inviteCode: profile.inviteCode };
    } catch (error) {
      if (error instanceof Error && error.message === "INVITE_CODE_TAKEN") {
        throw new ConflictException({
          code: "INVITE_CODE_TAKEN",
          message: "邀请码已被占用"
        });
      }
      throw error;
    }
  }

  async accept(visitorToken: string, request: FriendAcceptRequest) {
    const actorHash = this.actorHash(visitorToken);
    const code = parseInviteCode(request.inviteCode);
    if (!code) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    const target = await this.friends.findByInviteCode(code);
    if (!target) {
      throw new NotFoundException({
        code: "FRIEND_NOT_FOUND",
        message: "对方还没有打开过密友页"
      });
    }
    if (target.actorHash === actorHash) {
      throw new ForbiddenException({ code: "SELF_INVITE", message: "不能添加自己" });
    }
    const result = await this.friends.addFriendship(actorHash, target.actorHash);
    if (result === "full") {
      throw new ForbiddenException({ code: "FRIEND_FULL", message: "小圈已满" });
    }
    return { status: result, inviteCode: target.inviteCode };
  }

  async list(visitorToken: string): Promise<FriendListResponse> {
    const friends = await this.friends.listFriends(this.actorHash(visitorToken));
    return { friends };
  }

  async remove(visitorToken: string, inviteCode: string) {
    const code = parseInviteCode(inviteCode);
    if (!code) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    const target = await this.friends.findByInviteCode(code);
    if (!target) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    const removed = await this.friends.removeFriendship(
      this.actorHash(visitorToken),
      target.actorHash
    );
    if (!removed) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    return { removed: true };
  }

  async listFeed(
    visitorToken: string,
    inviteCode: string,
    cursor?: string,
    limit = 20
  ): Promise<FriendFeedResponse> {
    const code = parseInviteCode(inviteCode);
    if (!code) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    const owner = await this.friends.findByInviteCode(code);
    if (!owner) {
      throw new NotFoundException({ code: "FRIEND_NOT_FOUND", message: "没有找到这位密友" });
    }
    const viewerHash = this.actorHash(visitorToken);
    if (!(await this.friends.areFriends(viewerHash, owner.actorHash))) {
      throw new ForbiddenException({
        code: "NOT_FRIENDS",
        message: "还不是密友，不能查看朋友圈"
      });
    }
    const page = await this.life.listFriendsVisible(owner.actorHash, cursor, limit);
    return {
      events: page.events.map((event) => toFriendFeedEvent(event, owner.inviteCode)),
      nextCursor: page.nextCursor
    };
  }

  deleteAll(visitorToken: string) {
    return this.friends.deleteAll(this.actorHash(visitorToken));
  }
}

function toFriendFeedEvent(event: LifeEvent, ownerInviteCode: string): FriendFeedEvent {
  return {
    id: event.id,
    eventKey: event.eventKey,
    kind: event.kind,
    occurredAt: event.occurredAt,
    title: event.title,
    body: event.body,
    typeId: event.typeId,
    ...(event.itemId ? { itemId: event.itemId } : {}),
    ...(event.activity ? { activity: event.activity } : {}),
    ...(event.motive ? { motive: event.motive } : {}),
    ...(event.visitorTypeId ? { visitorTypeId: event.visitorTypeId } : {}),
    ...(event.storyChapter ? { storyChapter: event.storyChapter } : {}),
    source: event.source,
    visibility: event.visibility,
    ownerInviteCode
  };
}
