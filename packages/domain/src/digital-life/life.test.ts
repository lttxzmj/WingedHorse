import { describe, expect, it } from "vitest";
import {
  appendLifeEvent,
  createLifeEvent,
  lifeEventsVisibleToFriends,
  setLifeEventVisibility,
  toggleLifeEventInteraction
} from "./life.js";

const event = createLifeEvent({
  eventKey: "arrival:assessment-1",
  kind: "arrival",
  occurredAt: "2026-08-28T10:00:00.000Z",
  typeId: "chosen"
});

describe("digital life events", () => {
  it("creates deterministic, structured facts", () => {
    expect(createLifeEvent({ ...event, eventKey: event.eventKey })).toEqual(event);
    expect(event.id).toMatch(/^life-/);
  });

  it("deduplicates retries by event key", () => {
    expect(appendLifeEvent(appendLifeEvent([], event), event)).toEqual([event]);
  });

  it("updates only the requested interaction", () => {
    const [liked] = toggleLifeEventInteraction([event], event.id, "liked");
    expect(liked).toMatchObject({ liked: true, saved: false });
  });

  it("defaults new facts to private and can opt into friend visibility", () => {
    expect(event.visibility).toBe("private");
    const shared = setLifeEventVisibility([event], event.id, "friends")[0];
    expect(shared).toMatchObject({ visibility: "friends" });
    expect(lifeEventsVisibleToFriends([event])).toEqual([]);
    expect(shared ? lifeEventsVisibleToFriends([shared]) : []).toEqual(shared ? [shared] : []);
  });
});
