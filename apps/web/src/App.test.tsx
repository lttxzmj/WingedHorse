import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the entertainment assessment entry and AI-safe disclaimer", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "先看看今天的自己，再慢慢长出翅膀。" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始 90 秒测评" })).toBeEnabled();
    expect(screen.getByText("娱乐测评，不构成心理、医疗或职业建议。")).toBeVisible();
  });
});
