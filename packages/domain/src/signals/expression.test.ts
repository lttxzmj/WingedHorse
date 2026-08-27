import { describe, expect, it } from "vitest";
import { classifyExpression, EXPRESSION_LABEL, EXPRESSION_TAGS, type FaceLandmark } from "./expression.js";

const EYE = {
  left: { outer: 33, inner: 133, top: 159, bottom: 145 },
  right: { outer: 263, inner: 362, top: 386, bottom: 374 }
} as const;
const MOUTH = { lipTop: 13, lipBottom: 14, left: 61, right: 291 } as const;
const BROWS = { leftInner: 46, rightInner: 276 } as const;

function neutralFace(): FaceLandmark[] {
  const p: FaceLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  p[EYE.left.outer] = { x: 0.40, y: 0.45 };
  p[EYE.left.inner] = { x: 0.45, y: 0.45 };
  p[EYE.left.top] = { x: 0.425, y: 0.435 };
  p[EYE.left.bottom] = { x: 0.425, y: 0.465 };
  p[EYE.right.outer] = { x: 0.60, y: 0.45 };
  p[EYE.right.inner] = { x: 0.55, y: 0.45 };
  p[EYE.right.top] = { x: 0.575, y: 0.435 };
  p[EYE.right.bottom] = { x: 0.575, y: 0.465 };
  p[MOUTH.lipTop] = { x: 0.5, y: 0.60 };
  p[MOUTH.lipBottom] = { x: 0.5, y: 0.62 };
  p[MOUTH.left] = { x: 0.45, y: 0.61 };
  p[MOUTH.right] = { x: 0.55, y: 0.61 };
  p[BROWS.leftInner] = { x: 0.46, y: 0.38 };
  p[BROWS.rightInner] = { x: 0.54, y: 0.38 };
  return p;
}

describe("classifyExpression", () => {
  it("returns neutral for a relaxed face", () => {
    expect(classifyExpression(neutralFace())).toBe("neutral");
  });

  it("returns neutral when landmarks are missing", () => {
    expect(classifyExpression([])).toBe("neutral");
    expect(classifyExpression([{ x: 0.5, y: 0.5 }])).toBe("neutral");
  });

  it("detects tired eyes when they nearly close", () => {
    const p = neutralFace();
    p[EYE.left.top] = { x: 0.425, y: 0.46 };
    p[EYE.left.bottom] = { x: 0.425, y: 0.46 };
    p[EYE.right.top] = { x: 0.575, y: 0.46 };
    p[EYE.right.bottom] = { x: 0.575, y: 0.46 };
    expect(classifyExpression(p)).toBe("tired");
  });

  it("detects surprise when the mouth opens", () => {
    const p = neutralFace();
    p[MOUTH.lipTop] = { x: 0.5, y: 0.56 };
    p[MOUTH.lipBottom] = { x: 0.5, y: 0.66 };
    expect(classifyExpression(p)).toBe("surprise");
  });

  it("detects a smile when mouth corners lift", () => {
    const p = neutralFace();
    p[MOUTH.left] = { x: 0.45, y: 0.58 };
    p[MOUTH.right] = { x: 0.55, y: 0.58 };
    expect(classifyExpression(p)).toBe("smile");
  });

  it("detects a frown when corners drop and brows draw in", () => {
    const p = neutralFace();
    p[MOUTH.left] = { x: 0.45, y: 0.64 };
    p[MOUTH.right] = { x: 0.55, y: 0.64 };
    p[BROWS.leftInner] = { x: 0.47, y: 0.38 };
    p[BROWS.rightInner] = { x: 0.53, y: 0.38 };
    expect(classifyExpression(p)).toBe("frown");
  });

  it("exposes a label for every tag", () => {
    for (const tag of EXPRESSION_TAGS) {
      expect(EXPRESSION_LABEL[tag]).toBeTruthy();
    }
  });
});
