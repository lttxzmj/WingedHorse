import { describe, expect, it } from "vitest";
import {
  canAddFriend,
  clampFriendCount,
  createInviteCode,
  createInviteShare,
  decideAcceptInvite,
  DEFAULT_FRIEND_LIMITS,
  friendshipActorPair,
  isPlaceholderFriendNickname,
  parseInviteCode
} from "./friends.js";

describe("friend limits", () => {
  it("caps the roster at the configured maximum", () => {
    expect(DEFAULT_FRIEND_LIMITS.maxFriends).toBe(6);
    expect(canAddFriend(5)).toBe(true);
    expect(canAddFriend(6)).toBe(false);
    expect(clampFriendCount(99)).toBe(6);
  });
});

describe("invite share loop", () => {
  it("builds a short invite code and shareable friends URL", () => {
    const code = createInviteCode(() => 0);
    expect(code).toHaveLength(8);
    expect(parseInviteCode(code)).toBe(code);
    expect(createInviteShare("https://example.com/", code)).toEqual({
      title: "来来的小圈",
      text: "来来请你来草原坐坐",
      url: `https://example.com/friends?from=${code}`
    });
  });

  it("rejects self, duplicates, full roster and invalid codes", () => {
    expect(
      decideAcceptInvite({
        ownCode: "abcd1234",
        incomingCode: "abcd1234",
        existingIds: [],
        currentCount: 0
      })
    ).toBe("self");
    expect(
      decideAcceptInvite({
        ownCode: "abcd1234",
        incomingCode: "friend001",
        existingIds: ["friend001"],
        currentCount: 1
      })
    ).toBe("exists");
    expect(
      decideAcceptInvite({
        ownCode: "abcd1234",
        incomingCode: "friend001",
        existingIds: [],
        currentCount: 6
      })
    ).toBe("full");
    expect(
      decideAcceptInvite({
        ownCode: "abcd1234",
        incomingCode: "??",
        existingIds: [],
        currentCount: 0
      })
    ).toBe("invalid");
    expect(
      decideAcceptInvite({
        ownCode: "abcd1234",
        incomingCode: "friend001",
        existingIds: [],
        currentCount: 2
      })
    ).toBe("ok");
  });

  it("normalizes an undirected friendship pair", () => {
    expect(friendshipActorPair("bbb", "aaa")).toEqual(["aaa", "bbb"]);
    expect(friendshipActorPair("aaa", "bbb")).toEqual(["aaa", "bbb"]);
  });

  it("recognizes the old fake placeholder nicknames", () => {
    expect(isPlaceholderFriendNickname("密友 1")).toBe(true);
    expect(isPlaceholderFriendNickname("小红")).toBe(false);
  });
});
