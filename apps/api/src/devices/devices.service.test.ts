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
    expect(publish.mock.calls[1]![0]).toBe("devices/d-b/effect");
  });

  it("handles incoming telemetry and publishes derived events with nested hardware format", () => {
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
      telemetry: {
        obstacle: boolean;
        pressure: number;
        hasPress: boolean;
        led1: string;
        led2: string;
      };
      event: { type: string };
    };
    expect(item.telemetry.obstacle).toBe(true);
    expect(item.telemetry.pressure).toBe(3551);
    expect(item.telemetry.hasPress).toBe(true);
    expect(item.telemetry.led1).toBe("on");
    expect(item.telemetry.led2).toBe("on");
    expect(item.event.type).toBe("worker_presence");
  });

  it("handles DHT telemetry and derives climate drop events", () => {
    const { service } = makeService();
    const emitted: unknown[] = [];
    service.getEventsStream("lamp-001").subscribe((data) => emitted.push(data));

    const payload = Buffer.from(
      JSON.stringify({
        device_id: "lamp-001",
        led1: { state: "off" },
        led2: { state: "off" },
        dht: { temperature: 24.8, humidity: 30 }
      })
    );

    service.handleIncomingTelemetry("lamp-001/telemetry", payload);

    expect(emitted).toHaveLength(1);
    const item = emitted[0] as {
      telemetry: { dht: { temperature: number; humidity: number } };
      event: { type: string; humidity: number; itemId: string };
    };
    expect(item.telemetry.dht.temperature).toBe(24.8);
    expect(item.telemetry.dht.humidity).toBe(30);
    expect(item.event.type).toBe("climate_dry");
    expect(item.event.humidity).toBe(30);
    expect(item.event.itemId).toBe("iced-americano");
  });

  it("reports online after recent telemetry and offline when never seen", () => {
    const { service } = makeService();
    expect(service.getStatus("lamp-001")).toEqual({
      deviceId: "lamp-001",
      online: false,
      lastSeenAt: null
    });
    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(
        JSON.stringify({
          device_id: "lamp-001",
          led1: { state: "off" },
          led2: { state: "off" }
        })
      )
    );
    const status = service.getStatus("lamp-001");
    expect(status.online).toBe(true);
    expect(status.lastSeenAt).toEqual(expect.any(String));
    expect(service.getStatus("lamp-001", Date.now() + 91_000).online).toBe(false);
  });

  it("never forwards one device telemetry to a different device stream", () => {
    const { service } = makeService();
    const emitted: unknown[] = [];
    service.getEventsStream("d-other").subscribe((data) => emitted.push(data));

    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(
        JSON.stringify({
          device_id: "lamp-001",
          led1: { state: "off" },
          led2: { state: "off" }
        })
      )
    );

    expect(emitted).toHaveLength(0);
  });

  it("maps firmware interaction tap/rest_on to touch events and reads env climate", () => {
    const { service } = makeService();
    const emitted: unknown[] = [];
    service.getEventsStream("lamp-001").subscribe((data) => emitted.push(data));

    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(JSON.stringify({ deviceId: "lamp-001", interaction: "tap" }))
    );
    expect(emitted).toHaveLength(1);
    const tap = emitted[0] as {
      telemetry: { hasPress: boolean; pressure: number };
      event: { type: string };
    };
    expect(tap.telemetry.hasPress).toBe(true);
    expect(tap.telemetry.pressure).toBe(1200);
    expect(tap.event.type).toBe("touch_comfort");

    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(JSON.stringify({ deviceId: "lamp-001", interaction: "rest_on" }))
    );
    const rest = emitted[1] as { event: { type: string; stressLevel: string } };
    expect(rest.event.type).toBe("touch_comfort");
    expect(rest.event.stressLevel).toBe("calm");

    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(JSON.stringify({ deviceId: "lamp-001", interaction: "rest_off" }))
    );
    const restOff = emitted[2] as { event: null };
    expect(restOff.event).toBeNull();

    service.handleIncomingTelemetry(
      "devices/lamp-001/telemetry",
      Buffer.from(
        JSON.stringify({
          deviceId: "lamp-001",
          env: { temperatureC: 24, humidityPct: 30 }
        })
      )
    );
    const climate = emitted[3] as { event: { type: string; humidity: number } };
    expect(climate.event.type).toBe("climate_dry");
    expect(climate.event.humidity).toBe(30);
  });

  it("handles high temperature (>27C) with blinking LED1 and null-safe telemetry", () => {
    const { service } = makeService();
    const emitted: unknown[] = [];
    service.getEventsStream("lamp-001").subscribe((data) => emitted.push(data));

    // 1. Temperature > 27°C and led1 blinking
    const payloadHot = Buffer.from(
      JSON.stringify({
        device_id: "lamp-001",
        led1: { state: "blinking" },
        led2: { state: "off" },
        dht: { temperature: 28.2, humidity: 45 }
      })
    );
    service.handleIncomingTelemetry("lamp-001/telemetry", payloadHot);

    expect(emitted).toHaveLength(1);
    const hotItem = emitted[0] as {
      telemetry: { led1: string };
      event: { type: string; temperature: number };
    };
    expect(hotItem.telemetry.led1).toBe("blinking");
    expect(hotItem.event.type).toBe("climate_hot");
    expect(hotItem.event.temperature).toBe(28.2);

    // 2. DHT missing/null readings (fault tolerance)
    const payloadNull = Buffer.from(
      JSON.stringify({
        device_id: "lamp-001",
        led1: { state: "off" },
        led2: { state: "off" },
        dht: { temperature: null, humidity: null }
      })
    );
    service.handleIncomingTelemetry("lamp-001/telemetry", payloadNull);
    expect(emitted).toHaveLength(2);
    const nullItem = emitted[1] as {
      telemetry: { dht: { temperature: number | null; humidity: number | null } };
      event: { type: string };
    };
    expect(nullItem.telemetry.dht.temperature).toBeNull();
    expect(nullItem.telemetry.dht.humidity).toBeNull();
    expect(nullItem.event.type).toBe("telemetry_sync");
  });
});
