export interface ColorSample { timestampMs: number; green: number; motion: number; }
export interface PulseEstimate { bpm: number | null; confidence: "low" | "medium"; reason?: string; }

export function estimatePulse(samples: readonly ColorSample[]): PulseEstimate {
  if (samples.length < 60) return { bpm: null, confidence: "low", reason: "采样时间太短" };
  const duration = (samples[samples.length - 1]!.timestampMs - samples[0]!.timestampMs) / 1000;
  if (duration < 8) return { bpm: null, confidence: "low", reason: "需要至少 8 秒稳定画面" };
  const mean = samples.reduce((sum, sample) => sum + sample.green, 0) / samples.length;
  const centered = samples.map((sample) => sample.green - mean);
  const powers: Array<{ bpm: number; power: number }> = [];
  for (let bpm = 48; bpm <= 150; bpm += 1) {
    const frequency = bpm / 60;
    let sin = 0;
    let cos = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const time = (samples[index]!.timestampMs - samples[0]!.timestampMs) / 1000;
      const angle = 2 * Math.PI * frequency * time;
      sin += centered[index]! * Math.sin(angle);
      cos += centered[index]! * Math.cos(angle);
    }
    powers.push({ bpm, power: sin * sin + cos * cos });
  }
  powers.sort((a, b) => b.power - a.power);
  const best = powers[0]!;
  const median = powers[Math.floor(powers.length / 2)]!.power || 1;
  const averageMotion = samples.reduce((sum, sample) => sum + sample.motion, 0) / samples.length;
  if (best.power / median < 2.2 || averageMotion > 12) {
    return { bpm: null, confidence: "low", reason: averageMotion > 12 ? "画面移动较多" : "信号不够清晰" };
  }
  return { bpm: best.bpm, confidence: best.power / median > 4 && averageMotion < 5 ? "medium" : "low" };
}

export function classifyVisualActivity(samples: readonly ColorSample[]): "steady" | "moving" | "unknown" {
  if (samples.length < 10) return "unknown";
  const motion = samples.reduce((sum, sample) => sum + sample.motion, 0) / samples.length;
  return motion > 8 ? "moving" : "steady";
}
