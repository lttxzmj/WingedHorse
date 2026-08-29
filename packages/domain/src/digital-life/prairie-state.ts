import type { HorseTypeId } from "../assessment/types.js";
import { getResultProfile } from "../assessment/result-profiles.js";
import type { PetVitals } from "../game/inventory.js";
import { deriveCompanionGrowth, type CompanionGrowthStage } from "./growth.js";
import type { LifeEvent } from "./life.js";

export type TimeOfDay = "dawn" | "day" | "afternoon" | "dusk" | "night";

export interface CompanionPrairieStateInput {
  typeId: HorseTypeId;
  vitals: PetVitals;
  relationshipXp: number;
  now?: Date | undefined;
  manualMood?: string | null | undefined;
  latestEvent?: LifeEvent | null | undefined;
  recentMemory?: string | null | undefined;
  isInteracting?: boolean | undefined;
}

export interface CompanionPrairieState {
  timeOfDay: TimeOfDay;
  timeLabel: string;
  visualMood: "neutral" | "happy" | "tired" | "resting";
  activity: "idle" | "listening" | "talking";
  bubbleSpeech: string;
  statusNote: string;
  ambientTheme: "dawn" | "day" | "afternoon" | "dusk" | "night";
  growth: CompanionGrowthStage;
  treeHoleHint: string;
}

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 14) return "day";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "dusk";
  return "night";
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  dawn: "清晨",
  day: "白天",
  afternoon: "午后",
  dusk: "傍晚",
  night: "深夜"
};

export function deriveCompanionPrairieState(input: CompanionPrairieStateInput): CompanionPrairieState {
  const now = input.now ?? new Date();
  const timeOfDay = getTimeOfDay(now);
  const timeLabel = TIME_LABELS[timeOfDay];
  const growth = deriveCompanionGrowth(input.relationshipXp);
  const profile = getResultProfile(input.typeId);

  // 1. 判断视觉形态 (Visual Mood)
  let visualMood: "neutral" | "happy" | "tired" | "resting" = profile.mood;
  if (input.vitals.energy < 35 || input.manualMood === "tired" || input.manualMood === "sad") {
    visualMood = "tired";
  } else if (input.vitals.chaos > 70 || input.manualMood === "anxious") {
    visualMood = "tired";
  } else if (timeOfDay === "night" && input.vitals.energy < 60) {
    visualMood = "resting";
  } else if (input.vitals.energy >= 70 && input.vitals.chaos <= 40) {
    visualMood = "happy";
  }

  // 2. 判断动作状态 (Activity)
  let activity: "idle" | "listening" | "talking" = "idle";
  if (input.isInteracting) {
    activity = "listening";
  }

  // 3. 树洞与时段共振文案 (Bubble Speech & Tree Hole Hint)
  let bubbleSpeech = "";
  let treeHoleHint = "";
  let statusNote = "";

  // 优先考虑硬件/最近生活事件的回响
  if (input.latestEvent?.kind === "game-haul") {
    bubbleSpeech = "刚才接到的东西我都收好啦，随时可以来背包看看。";
  } else if (input.latestEvent?.kind === "gift") {
    bubbleSpeech = "谢谢你送来的补给，感觉草原上的风都变轻快了。";
  } else if (input.latestEvent?.kind === "quiet-moment") {
    bubbleSpeech = "就这样安静呆一会儿，什么也不做也很好。";
  }

  // 若无紧急即时事件，则根据时段 + 状态 + 成长阶段多维推导
  if (!bubbleSpeech) {
    if (visualMood === "tired") {
      statusNote = "想放空一会儿";
      if (growth.id === "trusted" || growth.id === "wingmate") {
        bubbleSpeech = "脑子里有点吵对不对？靠着帐篷坐一会儿，有我陪你。";
        treeHoleHint = "它察觉到你有点累，默默替你挡住了外界的声音。";
      } else {
        bubbleSpeech = "今天好像消耗了不少电量，先歇一歇吧。";
        treeHoleHint = "它安静地待在你身边，不催促你做任何决定。";
      }
    } else if (timeOfDay === "night") {
      statusNote = "夜间守候中";
      if (growth.id === "wingmate") {
        bubbleSpeech = "还没睡吗？草原的夜很深，不用为了明天提心吊胆。";
        treeHoleHint = "老友之间的夜话，想说什么它都会听。";
      } else if (growth.id === "trusted") {
        bubbleSpeech = "今晚的风很温柔。如果有想倾诉的，随时告诉我。";
        treeHoleHint = "它在帐篷边为你留了一盏温黄的光。";
      } else {
        bubbleSpeech = "夜深了，今晚这里很安全，安心睡个好觉。";
        treeHoleHint = "夜晚的树洞为你敞开。";
      }
    } else if (timeOfDay === "dawn") {
      statusNote = "刚伸了个懒腰";
      bubbleSpeech = "早呀。今天不用急着冲刺，按你舒服的步调走。";
      treeHoleHint = "晨光正好，它正在记住你的清晨节律。";
    } else if (timeOfDay === "afternoon") {
      statusNote = "在帐篷旁看云";
      bubbleSpeech = input.recentMemory
        ? `想起你之前说的「${input.recentMemory.slice(0, 12)}…」，现在心情好些了吗？`
        : "下午的云飘得很慢，要不要一起喝口水、喘口气？";
      treeHoleHint = "午后树洞时刻：倾听你的小碎片。";
    } else if (timeOfDay === "dusk") {
      statusNote = "准备收工看夕阳";
      bubbleSpeech = "这一天辛苦啦。不管今天完成了多少，你都已经做得很棒了。";
      treeHoleHint = "傍晚的微风会把今天的压力慢慢吹散。";
    } else {
      // 日间日常
      statusNote = visualMood === "happy" ? "步调轻快" : "安静陪伴中";
      bubbleSpeech = "我在草原看着帐篷呢，累了随时回来找我。";
      treeHoleHint = "随时可以和它说说话，不留痕迹。";
    }
  }

  return {
    timeOfDay,
    timeLabel,
    visualMood,
    activity,
    bubbleSpeech,
    statusNote: statusNote || `${timeLabel} · 陪伴中`,
    ambientTheme: timeOfDay,
    growth,
    treeHoleHint: treeHoleHint || "树洞为你留着一处安静的角落。"
  };
}
