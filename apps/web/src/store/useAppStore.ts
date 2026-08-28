import {
  addItem,
  appendLifeEvent,
  consumeItem,
  createLifeEvent,
  createPetVitalsFromAssessment,
  grantItems,
  INITIAL_PET_VITALS,
  advanceDigitalLife,
  type AssessmentAnswers,
  type AssessmentResult,
  type DailyPlan,
  type Inventory,
  type ItemId,
  type LifeEvent,
  type PetVitals,
  type WorldContext
} from "@wingedhorse/domain";
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
  settledGameIds: string[];
  manualMood: "good" | "flat" | "tired" | "anxious" | "sad" | null;
  memories: Array<{ id: string; content: string; createdAt: string }>;
  resultFeedback: "accurate" | "inaccurate" | null;
  hardwareLink: boolean;
  deviceId: string;
  setAnswer: (questionId: string, optionId: string) => void;
  setAssessmentIndex: (index: number) => void;
  setResult: (result: AssessmentResult) => void;
  resetAssessment: () => void;
  collectItem: (itemId: ItemId, quantity?: number) => void;
  useItem: (itemId: ItemId) => boolean;
  settleGame: (sessionId: string, rewards: Partial<Record<ItemId, number>>) => boolean;
  comfortPet: () => void;
  toggleLifeEventLike: (id: string) => void;
  toggleLifeEventSaved: (id: string) => void;
  mergeLifeEvents: (events: LifeEvent[]) => void;
  advanceLife: (now: string, timezoneOffsetMinutes: number) => void;
  applyLifeSync: (plan: DailyPlan, world: WorldContext, events: LifeEvent[]) => void;
  setLifeSyncEnabled: (enabled: boolean) => void;
  setManualMood: (mood: AppState["manualMood"]) => void;
  setHardwareLink: (enabled: boolean) => void;
  setDeviceId: (deviceId: string) => void;
  resetAll: () => void;
  addMemory: (content: string) => void;
  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;
  setResultFeedback: (feedback: AppState["resultFeedback"]) => void;
  ensureAssessmentVersion: (version: string) => void;
  getAnswers: () => AssessmentAnswers;
}

export function migratePersistedAppState(persistedState: unknown): Partial<AppState> {
  const state =
    typeof persistedState === "object" && persistedState !== null
      ? (persistedState as Record<string, unknown>)
      : {};

  return {
    ...state,
    relationshipXp: typeof state.relationshipXp === "number" ? state.relationshipXp : 0,
    lifeEvents: Array.isArray(state.lifeEvents) ? (state.lifeEvents as LifeEvent[]) : [],
    dailyPlan: state.dailyPlan ?? null,
    worldContext: state.worldContext ?? null,
    lifeSyncEnabled: state.lifeSyncEnabled === true,
    settledGameIds: Array.isArray(state.settledGameIds) ? (state.settledGameIds as string[]) : []
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
      settledGameIds: [],
      manualMood: null,
      memories: [],
      resultFeedback: null,
      hardwareLink: false,
      deviceId: "",
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
          relationshipXp: Math.min(999, state.relationshipXp + (state.gamesPlayed === 0 ? 8 : 2)),
          settledGameIds: [...state.settledGameIds.slice(-19), normalizedId],
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
      comfortPet: () =>
        set((state) => ({
          relationshipXp: Math.min(999, state.relationshipXp + 1),
          lifeEvents: state.result
            ? appendLifeEvent(
                state.lifeEvents,
                createLifeEvent({
                  eventKey: `quiet-moment:${new Date().toISOString().slice(0, 10)}`,
                  kind: "quiet-moment",
                  occurredAt: new Date().toISOString(),
                  typeId: state.result.typeId
                })
              )
            : state.lifeEvents
        })),
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
      setDeviceId: (deviceId) => set({ deviceId: deviceId.trim().slice(0, 64) }),
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
          settledGameIds: [],
          manualMood: null,
          memories: [],
          resultFeedback: null,
          hardwareLink: false,
          deviceId: ""
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
      version: 5,
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
        settledGameIds: state.settledGameIds,
        manualMood: state.manualMood,
        memories: state.memories,
        resultFeedback: state.resultFeedback,
        hardwareLink: state.hardwareLink,
        deviceId: state.deviceId
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AppState>) })
    }
  )
);
