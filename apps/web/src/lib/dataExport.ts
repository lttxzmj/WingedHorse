import type {
  AssessmentResult,
  DailyPlan,
  Inventory,
  LifeEvent,
  PetVitals,
  WorldContext
} from "@wingedhorse/domain";

export interface ExportableUserData {
  answers: Record<string, string>;
  assessmentIndex: number;
  assessmentVersion: string;
  result: AssessmentResult | null;
  inventory: Inventory;
  petVitals: PetVitals;
  gamesPlayed: number;
  relationshipXp: number;
  lifeEvents: LifeEvent[];
  dailyPlan: DailyPlan | null;
  worldContext: WorldContext | null;
  manualMood: "good" | "flat" | "tired" | "anxious" | "sad" | null;
  memories: Array<{ id: string; content: string; createdAt: string }>;
  resultFeedback: "accurate" | "inaccurate" | null;
  preferences: {
    lifeSyncEnabled: boolean;
    hardwareLink: boolean;
    deviceId: string;
  };
}

export interface UserDataExport {
  format: "wingedhorse-user-data";
  version: 1;
  exportedAt: string;
  scope: "current-device";
  notice: string;
  data: ExportableUserData;
}

type AppStateSnapshot = Omit<ExportableUserData, "preferences"> & ExportableUserData["preferences"];

export function createUserDataExport(
  state: AppStateSnapshot,
  exportedAt = new Date().toISOString()
): UserDataExport {
  return {
    format: "wingedhorse-user-data",
    version: 1,
    exportedAt,
    scope: "current-device",
    notice: "本文件只包含当前设备上的用户可见数据，不包含匿名凭证、内部会话 ID 或原始媒体。",
    data: {
      answers: state.answers,
      assessmentIndex: state.assessmentIndex,
      assessmentVersion: state.assessmentVersion,
      result: state.result,
      inventory: state.inventory,
      petVitals: state.petVitals,
      gamesPlayed: state.gamesPlayed,
      relationshipXp: state.relationshipXp,
      lifeEvents: state.lifeEvents,
      dailyPlan: state.dailyPlan,
      worldContext: state.worldContext,
      manualMood: state.manualMood,
      memories: state.memories,
      resultFeedback: state.resultFeedback,
      preferences: {
        lifeSyncEnabled: state.lifeSyncEnabled,
        hardwareLink: state.hardwareLink,
        deviceId: state.deviceId
      }
    }
  };
}

export function downloadUserDataExport(payload: UserDataExport) {
  const date = payload.exportedAt.slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `WingedHorse-我的数据-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
