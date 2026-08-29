import type { AssessmentResult } from "@wingedhorse/domain";
import { beforeEach, describe, expect, it } from "vitest";
import { migratePersistedAppState, useAppStore } from "./useAppStore";

const result: AssessmentResult = {
  questionSetId: "wingedhorse-workday",
  questionSetVersion: "2.1.0",
  rawScores: { energy: 1, engine: 1, chaos: 1, direction: 1 },
  normalizedScores: { energy: 50, engine: 50, chaos: 50, direction: 50 },
  typeId: "chosen",
  edgeDimensions: [],
  easterEggs: [],
  bloodline: { purity: 100, hidden: [] },
  directionHint: "clear-direction"
};

describe("game settlement and cultivation state", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("settles each game session only once", () => {
    useAppStore.getState().setResult(result);
    const first = useAppStore.getState().settleGame("session-1", { "iced-americano": 2 });
    const duplicate = useAppStore.getState().settleGame("session-1", { "iced-americano": 2 });

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(useAppStore.getState().inventory["iced-americano"]).toBe(2);
    expect(useAppStore.getState().gamesPlayed).toBe(1);
    expect(useAppStore.getState().relationshipXp).toBe(8);
    expect(useAppStore.getState().lifeEvents.map((event) => event.kind)).toEqual([
      "game-haul",
      "arrival"
    ]);
  });

  it("adds a small relationship response when an owned item is used", () => {
    useAppStore.getState().setResult(result);
    useAppStore.getState().settleGame("session-2", { "iced-americano": 1 });
    expect(useAppStore.getState().useItem("iced-americano")).toBe(true);
    expect(useAppStore.getState().relationshipXp).toBe(10);
    expect(useAppStore.getState().lifeEvents[0]).toMatchObject({
      kind: "gift",
      itemId: "iced-americano"
    });
  });

  it("rewards a quiet moment only once per day, including after a reload", () => {
    useAppStore.getState().setResult(result);
    expect(useAppStore.getState().comfortPet()).toBe(true);
    expect(useAppStore.getState().comfortPet()).toBe(false);
    expect(useAppStore.getState().relationshipXp).toBe(1);
    expect(
      useAppStore.getState().lifeEvents.filter((event) => event.kind === "quiet-moment")
    ).toHaveLength(1);
  });

  it("persists explicit life-event interactions", () => {
    useAppStore.getState().setResult(result);
    const [event] = useAppStore.getState().lifeEvents;
    useAppStore.getState().toggleLifeEventLike(event!.id);
    useAppStore.getState().toggleLifeEventSaved(event!.id);
    expect(useAppStore.getState().lifeEvents[0]).toMatchObject({ liked: true, saved: true });
    expect(useAppStore.getState().lifeEvents[0]?.visibility).toBe("private");
    useAppStore.getState().setLifeEventVisibility(event!.id, "friends");
    expect(useAppStore.getState().lifeEvents[0]?.visibility).toBe("friends");
  });

  it("keeps existing progress when persisted state is upgraded", () => {
    const migrated = migratePersistedAppState({
      result,
      inventory: { "iced-americano": 3 },
      memories: [{ id: "memory-1", content: "保留我", createdAt: "2026-08-28T00:00:00.000Z" }]
    });

    expect(migrated).toMatchObject({
      result,
      inventory: { "iced-americano": 3 },
      relationshipXp: 0,
      lifeEvents: [],
      settledGameIds: [],
      dailyPlan: null,
      worldContext: null
    });
    expect(migrated.memories).toHaveLength(1);
  });

  it("never lets game rewards exceed the sync contract XP limit", () => {
    useAppStore.setState({ relationshipXp: 998, settledGameIds: [], gamesPlayed: 1 });
    expect(useAppStore.getState().settleGame("xp-cap", {})).toBe(true);
    expect(useAppStore.getState().relationshipXp).toBe(999);
  });

  it("accepts invite codes without inventing placeholder friends", () => {
    const code = useAppStore.getState().ensureInviteCode();
    expect(code).toHaveLength(8);
    expect(useAppStore.getState().acceptInvite(code)).toBe("self");
    expect(useAppStore.getState().acceptInvite("friend99")).toBe("ok");
    expect(useAppStore.getState().friends).toEqual([{ id: "friend99", nickname: "新朋友" }]);
    const migrated = migratePersistedAppState({
      friends: [
        { id: "a", nickname: "密友 1" },
        { id: "b", nickname: "小红" }
      ],
      inviteCode: "legacy!!"
    });
    expect(migrated.friends).toEqual([{ id: "b", nickname: "小红" }]);
    expect(migrated.inviteCode).toBe("");
  });

  it("stores and manages hardware and climate life memories", () => {
    useAppStore.getState().addMemory("工位微气候干燥（湿度 30%），来来送上润燥补水包并提醒多喝水");
    useAppStore.getState().addMemory("在工位狠狠捏了捏小马释放高压，来来给予了温暖回应");

    const memories = useAppStore.getState().memories;
    expect(memories).toHaveLength(2);
    expect(memories[0]?.content).toContain("工位微气候干燥");
    expect(memories[1]?.content).toContain("释放高压");

    // 不允许重复添加完全相同的记忆
    useAppStore.getState().addMemory("工位微气候干燥（湿度 30%），来来送上润燥补水包并提醒多喝水");
    expect(useAppStore.getState().memories).toHaveLength(2);
  });
});
