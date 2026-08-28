import {
  addItem,
  consumeItem,
  createPetVitalsFromAssessment,
  INITIAL_PET_VITALS,
  type AssessmentAnswers,
  type AssessmentResult,
  type Inventory,
  type ItemId,
  type PetVitals
} from "@wingedhorse/domain";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  recordGame: () => void;
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
      manualMood: null,
      memories: [],
      resultFeedback: null,
      hardwareLink: false,
      deviceId: "",
      setAnswer: (questionId, optionId) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: optionId } })),
      setAssessmentIndex: (assessmentIndex) => set({ assessmentIndex }),
      setResult: (result) =>
        set({
          result,
          petVitals: createPetVitalsFromAssessment(result.normalizedScores)
        }),
      resetAssessment: () =>
        set({
          answers: {},
          assessmentIndex: 0,
          result: null,
          resultFeedback: null,
          assessmentOptionSeed: Math.random().toString(36).slice(2)
        }),
      collectItem: (itemId, quantity = 1) =>
        set((state) => ({ inventory: addItem(state.inventory, itemId, quantity) })),
      useItem: (itemId) => {
        const state = get();
        try {
          const next = consumeItem(state.inventory, state.petVitals, itemId);
          set(next);
          return true;
        } catch {
          return false;
        }
      },
      recordGame: () => set((state) => ({ gamesPlayed: state.gamesPlayed + 1 })),
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
              { id: crypto.randomUUID(), content: normalized, createdAt: new Date().toISOString() }
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
                resultFeedback: null,
                assessmentVersion: version,
                assessmentOptionSeed: Math.random().toString(36).slice(2)
              }
        ),
      getAnswers: () => get().answers
    }),
    {
      name: CURRENT_APP_STATE_KEY,
      version: 3,
      partialize: (state) => ({
        answers: state.answers,
        assessmentIndex: state.assessmentIndex,
        assessmentVersion: state.assessmentVersion,
        assessmentOptionSeed: state.assessmentOptionSeed,
        result: state.result,
        inventory: state.inventory,
        petVitals: state.petVitals,
        gamesPlayed: state.gamesPlayed,
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
