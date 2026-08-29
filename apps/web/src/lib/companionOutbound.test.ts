import { describe, expect, it } from "vitest";
import { buildCompanionOutboundText } from "./companionOutbound";

describe("buildCompanionOutboundText", () => {
  it("keeps plain text when no local image is attached", () => {
    expect(buildCompanionOutboundText("今天有点累", false)).toBe("今天有点累");
  });

  it("adds an on-device image note without uploading imagery", () => {
    expect(buildCompanionOutboundText("看着好累", true)).toContain("我看了一张图：看着好累");
    expect(buildCompanionOutboundText("看着好累", true)).toContain("没有上传");
    expect(buildCompanionOutboundText("  ", true)).toContain("没有上传");
  });
});
