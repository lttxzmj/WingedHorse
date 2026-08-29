import type { AssessmentResult } from "@wingedhorse/domain";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { useAppStore } from "../store/useAppStore";

const result: AssessmentResult = {
  questionSetId: "wingedhorse-v2-1",
  questionSetVersion: "2.1.0",
  rawScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
  normalizedScores: { energy: 50, engine: 50, chaos: 50, direction: 50 },
  typeId: "chosen",
  edgeDimensions: [],
  easterEggs: [],
  bloodline: { purity: 100, hidden: [] },
  directionHint: "clear-direction"
};

describe.sequential("SettingsPage entertainment questionnaire", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/settings");
    useAppStore.getState().resetAll();
  });

  afterEach(() => {
    cleanup();
    useAppStore.getState().resetAll();
  });

  it("offers a first-time entertainment start without diagnostic language", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "娱乐问卷" })).toBeInTheDocument();
    expect(screen.getByText("17 题，大约 90 秒。结果只作轻松参考，不是心理或职业建议。")).toBeVisible();
    expect(screen.getByRole("link", { name: "开始测测" })).toBeVisible();
    expect(screen.queryByText(/心理诊断|健康监测|治疗/u)).not.toBeInTheDocument();
    expect(screen.getByText(/来来是 AI，不是真人/u)).toBeVisible();
  });

  it("shows the current type and lets the user view or retake", async () => {
    useAppStore.getState().setResult(result);
    render(<App />);

    expect(
      await screen.findByText("你现在是「天选牛马」。类型只会在你主动重测时改变，结果只作轻松参考。")
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "查看结果" })).toHaveAttribute("href", "/result");

    fireEvent.click(screen.getByRole("button", { name: "重新测一次" }));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/assessment");
    });
    expect(useAppStore.getState().result).toBeNull();
  });
});
