export interface FriendLimits {
  maxFriends: number;
}

export const DEFAULT_FRIEND_LIMITS: FriendLimits = {
  maxFriends: 6
};

export const INVITE_CODE_PATTERN = /^[a-z0-9]{8,12}$/i;

export type AcceptInviteResult = "ok" | "self" | "full" | "exists" | "invalid";

export interface InviteSharePayload {
  title: string;
  text: string;
  url: string;
}

export function clampFriendCount(
  count: number,
  limits: FriendLimits = DEFAULT_FRIEND_LIMITS
): number {
  return Math.max(0, Math.min(limits.maxFriends, Math.floor(count)));
}

export function canAddFriend(
  currentCount: number,
  limits: FriendLimits = DEFAULT_FRIEND_LIMITS
): boolean {
  return clampFriendCount(currentCount, limits) < limits.maxFriends;
}

export function createInviteCode(random: () => number = Math.random): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    const pick = Math.floor(random() * alphabet.length);
    code += alphabet[pick] ?? "a";
  }
  return code;
}

export function parseInviteCode(value: string | null | undefined): string | null {
  const code = value?.trim().toLowerCase() ?? "";
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

export function createInviteShare(origin: string, inviteCode: string): InviteSharePayload {
  const code = parseInviteCode(inviteCode);
  if (!code) throw new Error("INVALID_INVITE_CODE");
  const base = origin.replace(/\/$/, "");
  return {
    title: "来来的小圈",
    text: "来来请你来草原坐坐",
    url: `${base}/friends?from=${encodeURIComponent(code)}`
  };
}

export function decideAcceptInvite(input: {
  ownCode: string;
  incomingCode: string;
  existingIds: readonly string[];
  currentCount: number;
  limits?: FriendLimits;
}): AcceptInviteResult {
  const code = parseInviteCode(input.incomingCode);
  if (!code) return "invalid";
  const own = parseInviteCode(input.ownCode);
  if (own && code === own) return "self";
  if (input.existingIds.some((id) => id.toLowerCase() === code)) return "exists";
  if (!canAddFriend(input.currentCount, input.limits)) return "full";
  return "ok";
}

export function isPlaceholderFriendNickname(nickname: string): boolean {
  return /^密友\s*\d+$/u.test(nickname.trim());
}
