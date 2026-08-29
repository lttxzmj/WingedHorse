import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./lib/faceLandmarker", () => ({
  detectFaceLandmarks: vi.fn().mockResolvedValue(null)
}));

describe("SignalsPage camera lifecycle", () => {
  const stopTrack = vi.fn();

  beforeEach(() => {
    window.history.replaceState({}, "", "/signals");
    stopTrack.mockClear();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }]
        })
      }
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires per-use consent and releases every track immediately", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<App />);
    const start = await screen.findByRole("button", { name: "开始 15 秒体验" });
    expect(start).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /同意本次临时使用摄像头处理画面稳定度和表情线索/u
      })
    );
    fireEvent.click(start);
    const stop = await screen.findByRole("button", { name: "立即停止" });
    fireEvent.click(stop);
    await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "开始 15 秒体验" })).toBeEnabled();
    expect(screen.getByLabelText("摄像头实时预览")).toHaveProperty("srcObject", null);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
