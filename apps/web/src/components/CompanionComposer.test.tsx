import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanionComposer } from "./CompanionComposer";

class FakeSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

describe("CompanionComposer voice control", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition
    });
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    Reflect.deleteProperty(window, "SpeechRecognition");
  });

  it("keeps the consent card hidden until the user taps the voice button", () => {
    render(
      <CompanionComposer
        variant="home"
        value=""
        onChange={() => undefined}
        onSubmit={() => undefined}
      />
    );

    const voice = screen.getByRole("button", { name: /语音：点一下听写，按住唤醒/u });
    expect(voice).toBeEnabled();
    expect(screen.queryByRole("button", { name: "好，开始用语音" })).not.toBeInTheDocument();

    fireEvent.click(voice);

    expect(screen.getByRole("button", { name: "好，开始用语音" })).toBeVisible();
    expect(screen.getByRole("button", { name: "暂不需要" })).toBeVisible();
  });

  it("starts dictation only after explicit consent and dismisses on decline", async () => {
    // 语音按钮有 320ms 防双击守卫，连续点击需要拉开间隔
    const tapGap = () => new Promise((resolve) => setTimeout(resolve, 340));
    render(
      <CompanionComposer
        variant="home"
        value=""
        onChange={() => undefined}
        onSubmit={() => undefined}
      />
    );

    const voice = screen.getByRole("button", { name: /语音：点一下听写，按住唤醒/u });
    fireEvent.click(voice);
    // 弹卡后未同意前不得开听
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "暂不需要" }));
    expect(screen.queryByRole("button", { name: "好，开始用语音" })).not.toBeInTheDocument();

    await tapGap();
    fireEvent.click(voice);
    fireEvent.click(screen.getByRole("button", { name: "好，开始用语音" }));
    expect(screen.queryByRole("button", { name: "好，开始用语音" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("正在听你说");
  });

  it("treats insecure contexts as unsupported and explains the HTTPS requirement", () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false
    });
    render(
      <CompanionComposer
        variant="home"
        value=""
        onChange={() => undefined}
        onSubmit={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /语音：点一下听写，按住唤醒/u }));
    expect(screen.queryByRole("button", { name: "好，开始用语音" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("需要 HTTPS");
    Reflect.deleteProperty(window, "isSecureContext");
  });
});

describe("CompanionComposer without speech support", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  afterEach(() => {
    cleanup();
  });

  it("explains the fallback instead of disabling the microphone button", () => {
    render(
      <CompanionComposer
        variant="home"
        value=""
        onChange={() => undefined}
        onSubmit={() => undefined}
      />
    );

    const voice = screen.getByRole("button", { name: /语音：点一下听写，按住唤醒/u });
    expect(voice).toBeEnabled();
    fireEvent.click(voice);
    expect(screen.getByRole("status")).toHaveTextContent("这台浏览器暂不支持语音");
  });
});
