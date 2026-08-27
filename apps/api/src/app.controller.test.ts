import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller.js";

describe("AppController", () => {
  it("reports a healthy API without exposing internal details", () => {
    const result = new AppController().health();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("wingedhorse-api");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
