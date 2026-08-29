import type { LifeEvent } from "@wingedhorse/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteRemoteLifeData, getVisitorToken, hasVisitorToken, syncLifeEvents } from "./lifeApi";

const event: LifeEvent = {
  id: "life-one",
  eventKey: "arrival:2.1.0:chosen",
  kind: "arrival",
  occurredAt: "2026-08-28T10:00:00.000Z",
  title: "新住客到达草原",
  body: "它绕着帐篷看了一圈。",
  typeId: "chosen",
  source: "user-action",
  visibility: "private",
  liked: true,
  saved: false
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("life API privacy boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("creates and reuses a high-entropy local capability", () => {
    const first = getVisitorToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(getVisitorToken()).toBe(first);
    expect(hasVisitorToken()).toBe(true);
  });

  it("syncs facts and explicit interactions only when called", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ ...event, liked: false }))
      .mockResolvedValueOnce(json(event))
      .mockResolvedValueOnce(json({ events: [event], nextCursor: null }));

    await expect(syncLifeEvents([event])).resolves.toEqual([event]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/life/events/life-one/interactions");
  });

  it("retains the deletion capability after a server failure", async () => {
    getVisitorToken();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 503));
    await expect(deleteRemoteLifeData()).rejects.toThrow("LIFE_API_503");
    expect(hasVisitorToken()).toBe(true);
  });

  it("removes the capability only after confirmed deletion", async () => {
    getVisitorToken();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ deleted: 1 }));
    await deleteRemoteLifeData();
    expect(hasVisitorToken()).toBe(false);
  });
});
