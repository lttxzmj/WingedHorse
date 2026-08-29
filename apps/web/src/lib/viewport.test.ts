import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearKeyboardInset,
  measureKeyboardInset,
  restoreDocumentViewport,
  syncKeyboardInset
} from "./viewport";

describe("viewport helpers", () => {
  afterEach(() => {
    clearKeyboardInset();
    vi.unstubAllGlobals();
  });

  it("resets document scroll offsets", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    document.documentElement.scrollTop = 240;
    document.body.scrollTop = 120;

    restoreDocumentViewport();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it("writes a keyboard inset custom property from the visual viewport", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { height: 520, offsetTop: 12 }
    });

    expect(measureKeyboardInset()).toBe(312);
    syncKeyboardInset(312);
    expect(document.documentElement.style.getPropertyValue("--keyboard-inset")).toBe("312px");

    syncKeyboardInset(4);
    expect(document.documentElement.style.getPropertyValue("--keyboard-inset")).toBe("0px");
  });
});
