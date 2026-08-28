import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the entertainment assessment entry and AI-safe disclaimer", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "你是什么牛马" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始 90 秒测评" })).toBeEnabled();
    expect(screen.getByText("测评结果仅供娱乐，牛马终究会自由的")).toBeVisible();
  });
});
