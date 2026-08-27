import { describe, expect, it, vi } from "vitest";
import { moodToLight } from "@wingedhorse/domain";
import { DevicesService } from "./devices.service.js";
import type { MqttProvider } from "./mqtt.provider.js";

function makeService() {
  const publish = vi.fn();
  const mqtt = { publish } as unknown as MqttProvider;
  return { service: new DevicesService(mqtt), publish };
}

describe("DevicesService", () => {
  it("maps mood to the domain light effect and publishes to the device topic", async () => {
    const { service, publish } = makeService();
    const result = await service.applyMood("d-123", "tired");

    expect(result.effect).toEqual(moodToLight("tired"));
    expect(result.mood).toBe("tired");
    expect(result.seq).toBeGreaterThan(0);
    expect(publish).toHaveBeenCalledWith("devices/d-123/effect", result);
  });

  it("isolates messages per device topic", async () => {
    const { service, publish } = makeService();
    await service.applyMood("d-a", "good");
    await service.applyMood("d-b", "sad");
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[0]![0]).toBe("devices/d-a/effect");
    expect(publish.mock.calls[1]![0]).toBe("devices/d-b/effect");
  });
});
