import {
  addItem,
  appendLifeEvent,
  consumeItem,
  createInviteCode,
  createLifeEvent,
  createPetVitalsFromAssessment,
  decideAcceptInvite,
  DEFAULT_FRIEND_LIMITS,
  grantItems,
  INITIAL_PET_VITALS,
  ITEM_CATALOG,
  isPlaceholderFriendNickname,
  normalizeLifeEventVisibility,
  parseInviteCode,
  setLifeEventVisibility as applyLifeEventVisibility,
  advanceDigitalLife,
  type AcceptInviteResult,
  type AssessmentAnswers,
  type AssessmentResult,
  type DailyPlan,
  type Inventory,
  type ItemId,
  type LifeEvent,
  type LifeEventVisibility,
  type PetVitals,
  type WorldContext
} from "@wingedhorse/domain";
import type { PlayerStateResponse } from "@wingedhorse/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClientId } from "../lib/clientId";

export const LEGACY_APP_STATE_KEY = "wingedhorse-local-state";
export const CURRENT_APP_STATE_KEY = "wingedhorse-local-state-v2-1";

if (typeof window !== "undefined" && window.localStorage) {
  window.localStorage.removeItem(LEGACY_APP_STATE_KEY);
}

interface AppState {
  answers: Record<string, string>;
  assessmentIndex: number;
  assessmentVersion: string;
  assessmentOptionSeed: string;
  result: AssessmentResult | null;
  inventory: Inventory;
  petVitals: PetVitals;
  gamesPlayed: number;
  relationshipXp: number;
  lifeEvents: LifeEvent[];
  dailyPlan: DailyPlan | null;
  worldContext: WorldContext | null;
  lifeSyncEnabled: boolean;
  cloudPlayerRevision: number;
  settledGameIds: string[];
  manualMood: "good" | "flat" | "tired" | "anxious" | "sad" | null;
  memories: Array<{ id: string; content: string; createdAt: string }>;
  resultFeedback: "accurate" | "inaccurate" | null;
  hardwareLink: boolean;
  deviceId: string;
  friends: Array<{ id: string; nickname: string }>;
  inviteCode: string;
  friendDisplayName: string;
  receivedSponsoredItemIds: ItemId[];
  workShift: { dateKey: string; status: "off" | "on"; startedAt: string | null };
  todayCaughtCount: number;
  setAnswer: (questionId: string, optionId: string) => void;
  setAssessmentIndex: (index: number) => void;
  setResult: (result: AssessmentResult) => void;
  resetAssessment: () => void;
  collectItem: (itemId: ItemId, quantity?: number) => void;
  useItem: (itemId: ItemId) => boolean;
  settleGame: (sessionId: string, rewards: Partial<Record<ItemId, number>>) => boolean;
  applyCloudGameSettlement: (sessionId: string, player: PlayerStateResponse) => void;
  applyCloudItemConsumption: (itemId: ItemId, player: PlayerStateResponse) => void;
  applyCloudPlayerState: (player: PlayerStateResponse) => void;
  comfortPet: () => boolean;
  toggleLifeEventLike: (id: string) => void;
  toggleLifeEventSaved: (id: string) => void;
  setLifeEventVisibility: (id: string, visibility: LifeEventVisibility) => void;
  mergeLifeEvents: (events: LifeEvent[]) => void;
  advanceLife: (now: string, timezoneOffsetMinutes: number) => void;
  applyLifeSync: (plan: DailyPlan, world: WorldContext, events: LifeEvent[]) => void;
  setLifeSyncEnabled: (enabled: boolean) => void;
  setManualMood: (mood: AppState["manualMood"]) => void;
  setHardwareLink: (enabled: boolean) => void;
  setFriendDisplayName: (name: string) => void;
  setDeviceId: (deviceId: string) => void;
  ensureInviteCode: () => string;
  acceptInvite: (code: string, nickname?: string) => AcceptInviteResult;
  removeFriend: (id: string) => void;
  mergeFriends: (friends: Array<{ id: string; nickname: string }>) => void;
  clockIn: () => void;
  clockOut: () => void;
  resetAll: () => void;
  addMemory: (content: string) => void;
  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;
  setResultFeedback: (feedback: AppState["resultFeedback"]) => void;
  ensureAssessmentVersion: (version: string) => void;
  getAnswers: () => AssessmentAnswers;
}

function mergeReceivedSponsoredItemIds(
  current: readonly ItemId[],
  rewards: Partial<Record<ItemId, number>>
): ItemId[] {
  const next = new Set(current);
  for (const [itemId, count] of Object.entries(rewards) as Array<[ItemId, number | undefined]>) {
    if ((count ?? 0) > 0 && ITEM_CATALOG[itemId]?.sponsored) next.add(itemId);
  }
  return [...next];
}

function migrateReceivedSponsoredItemIds(state: Record<string, unknown>): ItemId[] {
  const fromState = Array.isArray(state.receivedSponsoredItemIds)
    ? (state.receivedSponsoredItemIds as unknown[]).filter(
        (id): id is ItemId =>
          typeof id === "string" && Boolean(ITEM_CATALOG[id as ItemId]?.sponsored)
      )
    : [];
  const inventory =
    state.inventory && typeof state.inventory === "object"
      ? (state.inventory as Partial<Record<ItemId, number>>)
      : {};
  return mergeReceivedSponsoredItemIds(fromState, inventory);
}

export function migratePersistedAppState(persistedState: unknown): Partial<AppState> {
  const state =
    typeof persistedState === "object" && persistedState !== null
      ? (persistedState as Record<string, unknown>)
      : {};

  return {
    ...state,
    relationshipXp: typeof state.relationshipXp === "number" ? state.relationshipXp : 0,
    lifeEvents: Array.isArray(state.lifeEvents)
      ? (state.lifeEvents as LifeEvent[]).map((event) => ({
          ...event,
          visibility: normalizeLifeEventVisibility(event.visibility)
        }))
      : [],
    dailyPlan: state.dailyPlan ?? null,
    worldContext: state.worldContext ?? null,
    lifeSyncEnabled: state.lifeSyncEnabled === true,
    cloudPlayerRevision:
      typeof state.cloudPlayerRevision === "number" ? state.cloudPlayerRevision : 0,
    settledGameIds: Array.isArray(state.settledGameIds) ? (state.settledGameIds as string[]) : [],
    friends: Array.isArray(state.friends)
      ? (state.friends as AppState["friends"])
          .filter(
            (friend) =>
              friend &&
              typeof friend.id === "string" &&
              typeof friend.nickname === "string" &&
              !isPlaceholderFriendNickname(friend.nickname)
          )
          .slice(0, DEFAULT_FRIEND_LIMITS.maxFriends)
      : [],
    inviteCode: parseInviteCode(typeof state.inviteCode === "string" ? state.inviteCode : "") ?? "",
    receivedSponsoredItemIds: migrateReceivedSponsoredItemIds(state),
    workShift:
      state.workShift && typeof state.workShift === "object"
        ? (state.workShift as AppState["workShift"])
        : { dateKey: "", status: "off", startedAt: null },
    todayCaughtCount: typeof state.todayCaughtCount === "number" ? state.todayCaughtCount : 0
  } as Partial<AppState>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      answers: {},
      assessmentIndex: 0,
      assessmentVersion: "",
      assessmentOptionSeed: Math.random().toString(36).slice(2),
      result: null,
      inventory: {},
      petVitals: INITIAL_PET_VITALS,
      gamesPlayed: 0,
      relationshipXp: 0,
      lifeEvents: [],
      dailyPlan: null,
      worldContext: null,
      lifeSyncEnabled: false,
      cloudPlayerRevision: 0,
      settledGameIds: [],
      manualMood: null,
      memories: [],
      resultFeedback: null,
      hardwareLink: false,
      deviceId: "",
      friends: [],
      inviteCode: createInviteCode(),
      friendDisplayName: "",
      receivedSponsoredItemIds: [],
      workShift: { dateKey: "", status: "off", startedAt: null },
      todayCaughtCount: 0,
      setAnswer: (questionId, optionId) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: optionId } })),
      setAssessmentIndex: (assessmentIndex) => set({ assessmentIndex }),
      setResult: (result) =>
        set((state) => ({
          result,
          dailyPlan: null,
          worldContext: null,
          petVitals: createPetVitalsFromAssessment(result.normalizedScores),
          lifeEvents: appendLifeEvent(
            state.lifeEvents,
            createLifeEvent({
              eventKey: `arrival:${result.questionSetVersion}:${result.typeId}`,
              kind: "arrival",
              occurredAt: new Date().toISOString(),
              typeId: result.typeId
            })
          )
        })),
      resetAssessment: () =>
        set({
          answers: {},
          assessmentIndex: 0,
          result: null,
          dailyPlan: null,
          worldContext: null,
          resultFeedback: null,
          assessmentOptionSeed: Math.random().toString(36).slice(2)
        }),
      collectItem: (itemId, quantity = 1) =>
        set((state) => ({ inventory: addItem(state.inventory, itemId, quantity) })),
      useItem: (itemId) => {
        const state = get();
        try {
          const next = consumeItem(state.inventory, state.petVitals, itemId);
          set({
            ...next,
            relationshipXp: Math.min(999, state.relationshipXp + 2),
            lifeEvents: state.result
              ? appendLifeEvent(
                  state.lifeEvents,
                  createLifeEvent({
                    eventKey: `gift:${itemId}:${Date.now()}`,
                    kind: "gift",
                    occurredAt: new Date().toISOString(),
                    typeId: state.result.typeId,
                    itemId
                  })
                )
              : state.lifeEvents
          });
          return true;
        } catch {
          return false;
        }
      },
      settleGame: (sessionId, rewards) => {
        const normalizedId = sessionId.trim().slice(0, 80);
        if (!normalizedId || get().settledGameIds.includes(normalizedId)) return false;
        set((state) => ({
          inventory: grantItems(state.inventory, rewards),
          gamesPlayed: state.gamesPlayed + 1,
          todayCaughtCount:
            state.todayCaughtCount +
            Object.values(rewards).reduce((sum, count) => sum + (count ?? 0), 0),
          relationshipXp: Math.min(999, state.relationshipXp + (state.gamesPlayed === 0 ? 8 : 2)),
          settledGameIds: [...state.settledGameIds.slice(-19), normalizedId],
          receivedSponsoredItemIds: mergeReceivedSponsoredItemIds(
            state.receivedSponsoredItemIds,
            rewards
          ),
          lifeEvents: state.result
            ? appendLifeEvent(
                state.lifeEvents,
                createLifeEvent({
                  eventKey: `game-haul:${normalizedId}`,
                  kind: "game-haul",
                  occurredAt: new Date().toISOString(),
                  typeId: state.result.typeId
                })
              )
            : state.lifeEvents
        }));
        return true;
      },
      applyCloudPlayerState: (player) =>
        set({
          inventory: player.inventory,
          petVitals: player.vitals,
          gamesPlayed: player.gamesPlayed,
          relationshipXp: player.relationshipXp,
          cloudPlayerRevision: player.revision
        }),
      applyCloudGameSettlement: (sessionId, player) =>
        set((state) => ({
          inventory: player.inventory,
          petVitals: player.vitals,
          gamesPlayed: player.gamesPlayed,
          relationshipXp: player.relationshipXp,
          cloudPlayerRevision: player.revision,
          settledGameIds: state.settledGameIds.includes(sessionId)
            ? state.settledGameIds
            : [...state.settledGameIds.slice(-19), sessionId],
          lifeEvents: state.result
            ? appendLifeEvent(
                state.lifeEvents,
                createLifeEvent({
                  eventKey: `game-haul:${sessionId}`,
                  kind: "game-haul",
                  occurredAt: new Date().toISOString(),
                  typeId: state.result.typeId
                })
              )
            : state.lifeEvents
        })),
      applyCloudItemConsumption: (itemId, player) =>
        set((state) => ({
          inventory: player.inventory,
          petVitals: player.vitals,
          gamesPlayed: player.gamesPlayed,
          relationshipXp: player.relationshipXp,
          cloudPlayerRevision: player.revision,
          lifeEvents: state.result
            ? appendLifeEvent(
                state.lifeEvents,
                createLifeEvent({
                  eventKey: `gift:${itemId}:r${player.revision}`,
                  kind: "gift",
                  occurredAt: new Date().toISOString(),
                  typeId: state.result.typeId,
                  itemId
                })
              )
            : state.lifeEvents
        })),
      comfortPet: () => {
        const state = get();
        if (!state.result) return false;
        const eventKey = `quiet-moment:${new Date().toISOString().slice(0, 10)}`;
        if (state.lifeEvents.some((event) => event.eventKey === eventKey)) return false;
        set({
          relationshipXp: Math.min(999, state.relationshipXp + 1),
          lifeEvents: appendLifeEvent(
            state.lifeEvents,
            createLifeEvent({
              eventKey,
              kind: "quiet-moment",
              occurredAt: new Date().toISOString(),
              typeId: state.result.typeId
            })
          )
        });
        return true;
      },
      toggleLifeEventLike: (id) =>
        set((state) => ({
          lifeEvents: state.lifeEvents.map((event) =>
            event.id === id ? { ...event, liked: !event.liked } : event
          )
        })),
      toggleLifeEventSaved: (id) =>
        set((state) => ({
          lifeEvents: state.lifeEvents.map((event) =>
            event.id === id ? { ...event, saved: !event.saved } : event
          )
        })),
      setLifeEventVisibility: (id, visibility) =>
        set((state) => ({
          lifeEvents: applyLifeEventVisibility(state.lifeEvents, id, visibility)
        })),
      mergeLifeEvents: (events) =>
        set((state) => {
          const merged = new Map(state.lifeEvents.map((event) => [event.eventKey, event]));
          for (const event of events) merged.set(event.eventKey, event);
          return {
            lifeEvents: [...merged.values()]
              .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
              .slice(0, 30)
          };
        }),
      advanceLife: (now, timezoneOffsetMinutes) =>
        set((state) => {
          if (!state.result) return {};
          const next = advanceDigitalLife({
            visitorId: state.assessmentOptionSeed,
            typeId: state.result.typeId,
            now,
            timezoneOffsetMinutes,
            vitals: state.petVitals,
            relationshipXp: state.relationshipXp,
            events: state.lifeEvents,
            ...(state.dailyPlan ? { previousPlan: state.dailyPlan } : {})
          });
          return { lifeEvents: next.events, dailyPlan: next.plan, worldContext: next.world };
        }),
      applyLifeSync: (dailyPlan, worldContext, events) =>
        set({ dailyPlan, worldContext, lifeEvents: events }),
      setLifeSyncEnabled: (lifeSyncEnabled) => set({ lifeSyncEnabled }),
      setManualMood: (manualMood) => set({ manualMood }),
      setHardwareLink: (hardwareLink) => set({ hardwareLink }),
      setFriendDisplayName: (name) => set({ friendDisplayName: name.trim().slice(0, 24) }),
      setDeviceId: (deviceId) => set({ deviceId: deviceId.slice(0, 64) }),
      ensureInviteCode: () => {
        const existing = parseInviteCode(get().inviteCode);
        if (existing) return existing;
        const next = createInviteCode();
        set({ inviteCode: next });
        return next;
      },
      acceptInvite: (code, nickname = "新朋友") => {
        const state = get();
        const ownCode = parseInviteCode(state.inviteCode) ?? get().ensureInviteCode();
        const decision = decideAcceptInvite({
          ownCode,
          incomingCode: code,
          existingIds: state.friends.map((friend) => friend.id),
          currentCount: state.friends.length
        });
        if (decision !== "ok") return decision;
        const normalized = parseInviteCode(code);
        if (!normalized) return "invalid";
        const label = nickname.trim().slice(0, 16) || "新朋友";
        set({
          friends: [...state.friends, { id: normalized, nickname: label }]
        });
        return "ok";
      },
      removeFriend: (id) =>
        set((state) => ({ friends: state.friends.filter((friend) => friend.id !== id) })),
      mergeFriends: (incoming) =>
        set((state) => {
          const merged = new Map(state.friends.map((friend) => [friend.id, friend]));
          for (const friend of incoming) {
            const existing = merged.get(friend.id);
            merged.set(friend.id, {
              id: friend.id,
              nickname:
                existing?.nickname && existing.nickname !== "新朋友"
                  ? existing.nickname
                  : friend.nickname
            });
          }
          return { friends: [...merged.values()].slice(0, DEFAULT_FRIEND_LIMITS.maxFriends) };
        }),
      clockIn: () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        set((state) => ({
          workShift: { dateKey, status: "on", startedAt: new Date().toISOString() },
          todayCaughtCount: state.workShift.dateKey === dateKey ? state.todayCaughtCount : 0
        }));
      },
      clockOut: () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        set({ workShift: { dateKey, status: "off", startedAt: null } });
      },
      resetAll: () =>
        set({
          answers: {},
          assessmentIndex: 0,
          assessmentVersion: "",
          assessmentOptionSeed: Math.random().toString(36).slice(2),
          result: null,
          inventory: {},
          petVitals: INITIAL_PET_VITALS,
          gamesPlayed: 0,
          relationshipXp: 0,
          lifeEvents: [],
          dailyPlan: null,
          worldContext: null,
          lifeSyncEnabled: false,
          cloudPlayerRevision: 0,
          settledGameIds: [],
          manualMood: null,
          memories: [],
          resultFeedback: null,
          hardwareLink: false,
          deviceId: "",
          friends: [],
          inviteCode: createInviteCode(),
          friendDisplayName: "",
          receivedSponsoredItemIds: [],
          workShift: { dateKey: "", status: "off", startedAt: null },
          todayCaughtCount: 0
        }),
      addMemory: (content) =>
        set((state) => {
          const normalized = content.trim().slice(0, 240);
          if (
            !normalized ||
            state.memories.length >= 20 ||
            state.memories.some((memory) => memory.content === normalized)
          )
            return {};
          return {
            memories: [
              ...state.memories,
              { id: createClientId(), content: normalized, createdAt: new Date().toISOString() }
            ]
          };
        }),
      updateMemory: (id, content) =>
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.id === id ? { ...memory, content: content.trim().slice(0, 240) } : memory
          )
        })),
      deleteMemory: (id) =>
        set((state) => ({ memories: state.memories.filter((memory) => memory.id !== id) })),
      setResultFeedback: (resultFeedback) => set({ resultFeedback }),
      ensureAssessmentVersion: (version) =>
        set((state) =>
          state.assessmentVersion === version
            ? {}
            : {
                answers: {},
                assessmentIndex: 0,
                result: null,
                dailyPlan: null,
                worldContext: null,
                resultFeedback: null,
                assessmentVersion: version,
                assessmentOptionSeed: Math.random().toString(36).slice(2)
              }
        ),
      getAnswers: () => get().answers
    }),
    {
      name: CURRENT_APP_STATE_KEY,
      version: 8,
      migrate: migratePersistedAppState,
      partialize: (state) => ({
        answers: state.answers,
        assessmentIndex: state.assessmentIndex,
        assessmentVersion: state.assessmentVersion,
        assessmentOptionSeed: state.assessmentOptionSeed,
        result: state.result,
        inventory: state.inventory,
        petVitals: state.petVitals,
        gamesPlayed: state.gamesPlayed,
        relationshipXp: state.relationshipXp,
        lifeEvents: state.lifeEvents,
        dailyPlan: state.dailyPlan,
        worldContext: state.worldContext,
        lifeSyncEnabled: state.lifeSyncEnabled,
        cloudPlayerRevision: state.cloudPlayerRevision,
        settledGameIds: state.settledGameIds,
        receivedSponsoredItemIds: state.receivedSponsoredItemIds,
        manualMood: state.manualMood,
        memories: state.memories,
        resultFeedback: state.resultFeedback,
        hardwareLink: state.hardwareLink,
        deviceId: state.deviceId,
        friends: state.friends,
        inviteCode: state.inviteCode,
        friendDisplayName: state.friendDisplayName,
        workShift: state.workShift,
        todayCaughtCount: state.todayCaughtCount
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AppState>) })
    }
  )
);
