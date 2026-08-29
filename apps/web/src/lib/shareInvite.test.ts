import { afterEach, describe, expect, it, vi } from "vitest";
import { shareOrCopyInvite } from "./shareInvite";

describe("shareOrCopyInvite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns shared when the system share sheet succeeds", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn() }
    });
    await expect(
      shareOrCopyInvite({
        title: "来来的小圈",
        text: "来来请你来草原坐坐",
        url: "https://example.com/friends?from=abcd1234"
      })
    ).resolves.toBe("shared");
  });

  it("copies when share is unavailable and clipboard works", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
    await expect(
      shareOrCopyInvite({ title: "来来的小圈", text: "hi", url: "https://example.com/x" })
    ).resolves.toBe("copied");
  });

  it("returns manual when neither share nor clipboard can finish", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied"))
      }
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: () => false
    });
    await expect(
      shareOrCopyInvite({ title: "来来的小圈", text: "hi", url: "https://example.com/x" })
    ).resolves.toBe("manual");
  });
});
