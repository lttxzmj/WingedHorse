import { describe, expect, it, vi } from "vitest";
import { moodToLight } from "@wingedhorse/domain";
import { DevicesService } from "./devices.service.js";
import type { MqttProvider } from "./mqtt.provider.js";

function makeService() {
  const publish = vi.fn();
  const subscribe = vi.fn();
  const mqtt = { publish, subscribe } as unknown as MqttProvider;
  return { service: new DevicesService(mqtt), publish, subscribe };
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
    expect(publish.mock.calls[0]![0]).toBe("devices/d-a/effect");
    expect(publish.mock.calls[4]![0]).toBe("devices/d-b/effect");
  });

  it("handles incoming telemetry and publishes derived events with nested hardware format", async () => {
    const { service } = makeService();
    const emitted: unknown[] = [];
    service.getEventsStream("lamp-001").subscribe((data) => emitted.push(data));

    const payload = Buffer.from(
      JSON.stringify({
        device_id: "lamp-001",
        ultrasonic: { obstacle: true },
        led1: { state: "on" },
        pressure: { value: 3551, has_pressure: true },
        led2: { state: "on" }
      })
    );

    service.handleIncomingTelemetry("devices/lamp-001/telemetry", payload);

    expect(emitted).toHaveLength(1);
    const item = emitted[0] as {
      telemetry: { obstacle: boolean; pressure: number; hasPress: boolean; led1: string; led2: string };
      event: { type: string };
    };
    expect(item.telemetry.obstacle).toBe(true);
    expect(item.telemetry.pressure).toBe(3551);
    expect(item.telemetry.hasPress).toBe(true);
    expect(item.telemetry.led1).toBe("on");
    expect(item.telemetry.led2).toBe("on");
    expect(item.event.type).toBe("worker_presence");
  });
});
