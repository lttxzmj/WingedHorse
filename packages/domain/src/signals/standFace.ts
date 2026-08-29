export type StandFaceMood = "on-duty" | "tired" | "rare" | "off-work" | "stealth";

export interface StandFace {
  mood: StandFaceMood;
  kaomoji: string;
  line: string;
}

const faces: Record<StandFaceMood, Omit<StandFace, "mood">> = {
  "on-duty": { kaomoji: "(｀・ω・´)", line: "来了。手机给我。" },
  tired: { kaomoji: "(´-ω-｀)", line: "先充一会儿电。" },
  rare: { kaomoji: "(✪ω✪)", line: "这个，亮晶晶。" },
  "off-work": { kaomoji: "(・ω・)ノ", line: "收工。草原见。" },
  stealth: { kaomoji: "(・ω・)", line: "……正经工作中。" }
};

export function getStandFace(mood: StandFaceMood): StandFace {
  return { mood, ...faces[mood] };
}

export function standFaceFromVitals(energy: number, stealth: boolean): StandFaceMood {
  if (stealth) return "stealth";
  if (energy < 35) return "tired";
  return "on-duty";
}
