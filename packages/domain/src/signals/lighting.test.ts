import { describe, expect, it } from "vitest";
import {
  expressionToFlash,
  isHexColor,
  MOOD_LIGHT,
  moodToLight,
  restModeLight,
  rewardFlash,
  statusLight,
  type MoodId
} from "./lighting.js";

const MOODS: MoodId[] = ["good", "flat", "tired", "anxious", "sad"];

describe("mood → light", () => {
  it("maps every mood to a valid effect", () => {
    for (const mood of MOODS) {
      const effect = moodToLight(mood);
      expect(isHexColor(effect.color)).toBe(true);
      expect(effect.brightness).toBeGreaterThanOrEqual(0);
      expect(effect.brightness).toBeLessThanOrEqual(100);
      expect(effect.animation).toBeTruthy();
    }
  });

  it("is stable for the same mood", () => {
    expect(moodToLight("tired")).toEqual(MOOD_LIGHT.tired);
  });

  it("uses restrained brightness for low-energy moods", () => {
    expect(moodToLight("tired").brightness).toBeLessThan(moodToLight("good").brightness);
    expect(moodToLight("sad").brightness).toBeLessThan(moodToLight("good").brightness);
  });
});

describe("rest / reward / status", () => {
  it("rest mode is dim and non-intrusive", () => {
    const effect = restModeLight();
    expect(effect.brightness).toBeLessThanOrEqual(20);
    expect(effect.animation).toBe("breathe");
  });

  it("reward flash is a single pulse", () => {
    expect(rewardFlash().animation).toBe("pulse");
  });

  it("offline status is off", () => {
    expect(statusLight(false).animation).toBe("off");
    expect(statusLight(false).brightness).toBe(0);
  });
});

describe("expression → flash", () => {
  it("maps each expression to a valid effect", () => {
    for (const expression of ["smile", "frown", "surprise", "tired", "neutral"] as const) {
      const effect = expressionToFlash(expression);
      expect(isHexColor(effect.color)).toBe(true);
    }
  });
});

describe("isHexColor", () => {
  it("accepts #RRGGBB only", () => {
    expect(isHexColor("#FFD057")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("FFD057")).toBe(false);
    expect(isHexColor("#GGGGGG")).toBe(false);
  });
});
