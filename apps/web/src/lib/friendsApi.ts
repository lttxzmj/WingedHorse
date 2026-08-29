import {
  friendFeedSchema,
  friendListSchema,
  type FriendFeedResponse,
  type FriendListResponse
} from "@wingedhorse/contracts";
import { parseInviteCode } from "@wingedhorse/domain";
import { visitorHeaders } from "./lifeApi";

function errorCode(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    if ("code" in body && typeof body.code === "string") {
      return body.code;
    }
    const nested = (body as { message?: unknown }).message;
    if (
      nested &&
      typeof nested === "object" &&
      "code" in nested &&
      typeof nested.code === "string"
    ) {
      return nested.code;
    }
  }
  return `HTTP_${status}`;
}

async function expectJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorCode(body, response.status));
  return body;
}

export async function registerFriendProfile(inviteCode: string, displayName?: string) {
  const code = parseInviteCode(inviteCode);
  if (!code) throw new Error("INVALID_INVITE_CODE");
  const response = await fetch("/api/friends/register", {
    method: "POST",
    headers: visitorHeaders(),
    body: JSON.stringify({
      inviteCode: code,
      ...(displayName ? { displayName } : {})
    })
  });
  return expectJson(response);
}

export async function acceptFriendInvite(inviteCode: string, nickname?: string) {
  const code = parseInviteCode(inviteCode);
  if (!code) throw new Error("INVALID_INVITE_CODE");
  const response = await fetch("/api/friends/accept", {
    method: "POST",
    headers: visitorHeaders(),
    body: JSON.stringify({
      inviteCode: code,
      ...(nickname ? { nickname } : {})
    })
  });
  return expectJson(response);
}

export async function listFriends(): Promise<FriendListResponse> {
  const response = await fetch("/api/friends", { headers: visitorHeaders() });
  return friendListSchema.parse(await expectJson(response));
}

export async function removeRemoteFriend(inviteCode: string): Promise<void> {
  const code = parseInviteCode(inviteCode);
  if (!code) return;
  const response = await fetch(`/api/friends/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: visitorHeaders()
  });
  if (response.status === 404) return;
  await expectJson(response);
}

export async function fetchFriendFeed(
  inviteCode: string,
  cursor?: string
): Promise<FriendFeedResponse> {
  const code = parseInviteCode(inviteCode);
  if (!code) throw new Error("INVALID_INVITE_CODE");
  const search = new URLSearchParams({ limit: "30" });
  if (cursor) search.set("cursor", cursor);
  const response = await fetch(`/api/friends/${encodeURIComponent(code)}/events?${search}`, {
    headers: visitorHeaders()
  });
  return friendFeedSchema.parse(await expectJson(response));
}

export function friendApiMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "FRIEND_NOT_FOUND":
      return "对方还没有打开过密友页，请让对方先进入密友再试。";
    case "NOT_FRIENDS":
      return "还不是密友，不能查看这条朋友圈。";
    case "FRIEND_FULL":
      return "小圈满了，先移除一位。";
    case "SELF_INVITE":
      return "这是你自己的邀请。";
    case "INVITE_CODE_TAKEN":
      return "邀请码暂时不可用，请稍后再试。";
    default:
      return "网络不稳定，密友关系稍后再同步。";
  }
}
