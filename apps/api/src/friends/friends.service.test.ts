import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { LifeRepository } from "../life/life.repository.js";
import { LifeService } from "../life/life.service.js";
import { FriendsRepository } from "./friends.repository.js";
import { FriendsService } from "./friends.service.js";

const alice = "A".repeat(43);
const bob = "B".repeat(43);
const stranger = "C".repeat(43);

function services() {
  const lifeRepository = new LifeRepository();
  const friendsRepository = new FriendsRepository();
  return {
    life: new LifeService(lifeRepository),
    friends: new FriendsService(friendsRepository, lifeRepository)
  };
}

describe("FriendsService visibility ACL", () => {
  it("lets a confirmed friend read only friends-visible events", async () => {
    const { life, friends } = services();
    await friends.register(alice, { inviteCode: "alice001" });
    await friends.register(bob, { inviteCode: "bob00001" });
    await friends.accept(bob, { inviteCode: "alice001" });

    const privateEvent = await life.create(alice, {
      eventKey: "arrival:alice-private",
      kind: "arrival",
      occurredAt: "2026-08-28T10:00:00.000Z",
      typeId: "chosen",
      visibility: "private"
    });
    const sharedEvent = await life.create(alice, {
      eventKey: "gift:alice-friends",
      kind: "gift",
      occurredAt: "2026-08-28T11:00:00.000Z",
      typeId: "chosen",
      itemId: "iced-americano",
      visibility: "friends"
    });

    const feed = await friends.listFeed(bob, "alice001");
    expect(feed.events.map((event) => event.eventKey)).toEqual(["gift:alice-friends"]);
    expect(feed.events[0]).toMatchObject({
      ownerInviteCode: "alice001",
      visibility: "friends"
    });
    expect(feed.events[0]).not.toHaveProperty("liked");
    expect(feed.events[0]).not.toHaveProperty("saved");

    await expect(friends.listFeed(stranger, "alice001")).rejects.toBeInstanceOf(ForbiddenException);
    expect((await life.list(alice)).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: privateEvent.id, visibility: "private" }),
        expect.objectContaining({ id: sharedEvent.id, visibility: "friends" })
      ])
    );
  });

  it("hides a post after the owner switches it back to private", async () => {
    const { life, friends } = services();
    await friends.register(alice, { inviteCode: "alice002" });
    await friends.register(bob, { inviteCode: "bob00002" });
    await friends.accept(alice, { inviteCode: "bob00002" });
    const event = await life.create(bob, {
      eventKey: "quiet:bob",
      kind: "quiet-moment",
      occurredAt: "2026-08-28T12:00:00.000Z",
      typeId: "tired",
      visibility: "friends"
    });
    expect((await friends.listFeed(alice, "bob00002")).events).toHaveLength(1);
    await life.setVisibility(bob, event.id, { visibility: "private" });
    expect((await friends.listFeed(alice, "bob00002")).events).toEqual([]);
  });

  it("rejects unknown invite codes and removes the edge with account deletion", async () => {
    const { friends } = services();
    await friends.register(alice, { inviteCode: "alice003" });
    await expect(friends.accept(bob, { inviteCode: "missing99" })).rejects.toBeInstanceOf(
      NotFoundException
    );
    await friends.register(bob, { inviteCode: "bob00003" });
    await friends.accept(bob, { inviteCode: "alice003" });
    expect((await friends.list(alice)).friends).toHaveLength(1);
    await friends.deleteAll(alice);
    await expect(friends.listFeed(bob, "alice003")).rejects.toBeInstanceOf(NotFoundException);
    expect((await friends.list(bob)).friends).toEqual([]);
  });
});
