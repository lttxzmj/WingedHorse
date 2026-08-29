import { afterEach, describe, expect, it } from "vitest";
import { DevicesController } from "./devices.controller.js";
import type { DevicesService } from "./devices.service.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalHardwareFlag = process.env.HARDWARE_API_ENABLED;

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw");
}

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalHardwareFlag === undefined) delete process.env.HARDWARE_API_ENABLED;
  else process.env.HARDWARE_API_ENABLED = originalHardwareFlag;
});

describe("DevicesController", () => {
  it("fails closed for every production hardware route", () => {
    process.env.NODE_ENV = "production";
    process.env.HARDWARE_API_ENABLED = "true";
    const controller = new DevicesController({} as DevicesService);

    for (const action of [
      () => controller.status("lamp-001"),
      () => controller.applyEffect("lamp-001", { mood: "good" }),
      () => controller.streamEvents("lamp-001")
    ]) {
      expect(thrownBy(action)).toMatchObject({
        response: { code: "HARDWARE_NOT_AVAILABLE" }
      });
    }
  });
});
