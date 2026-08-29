import { describe, expect, it } from "vitest";
import { getStandFace, standFaceFromVitals } from "./standFace.js";

describe("stand face", () => {
  it("keeps on-duty and tired faces in the same kaomoji family", () => {
    expect(getStandFace("on-duty").kaomoji).toContain("ω");
    expect(getStandFace("tired").kaomoji).toContain("ω");
    expect(getStandFace("rare").line).toBe("这个，亮晶晶。");
    expect(getStandFace("off-work").line).toBe("收工。草原见。");
  });

  it("uses stealth when the stand is covering, otherwise energy", () => {
    expect(standFaceFromVitals(80, true)).toBe("stealth");
    expect(standFaceFromVitals(20, false)).toBe("tired");
    expect(standFaceFromVitals(80, false)).toBe("on-duty");
  });
});
