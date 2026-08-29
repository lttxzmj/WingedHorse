import type { MoodId, HardwareInteractionEvent } from "@wingedhorse/domain";
import {
  deviceStatusSchema,
  type DeviceStatus,
  type DeviceTelemetry
} from "@wingedhorse/contracts";

type DeviceEventCallback = (event: HardwareInteractionEvent, telemetry: DeviceTelemetry) => void;

interface SharedDeviceConnection {
  source: EventSource;
  callbacks: Set<DeviceEventCallback>;
}

const sharedConnections = new Map<string, SharedDeviceConnection>();
export const hardwareApiEnabled = import.meta.env.VITE_HARDWARE_API_ENABLED === "true";

export type SendMoodOptions = {
  /** 必须为 true：对应设置页「联动硬件」开关。 */
  linked: boolean;
};

/**
 * 把心情下发到已配对的硬件设备（经服务端 → MQTT → 设备）。
 * 仅在用户开启「联动硬件」且填写设备 ID 后调用；失败静默忽略，不影响主流程。
 * 禁止回落到默认 deviceId（如 lamp-001）。
 */
export async function sendMoodToDevice(
  deviceId: string,
  mood: MoodId,
  options: SendMoodOptions
): Promise<void> {
  if (!hardwareApiEnabled || !options.linked) return;
  const id = deviceId.trim();
  if (!id) return;
  try {
    const res = await fetch(`/api/devices/${encodeURIComponent(id)}/effects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood })
    });
    console.log("[sendMoodToDevice] Response status:", res.status);
  } catch (err) {
    console.error("[sendMoodToDevice] Failed to send effect:", err);
  }
}

/**
 * 订阅硬件设备的实时事件通道（SSE）。
 * 支持超声波障碍预警、Boss靠近预警、FSR 触摸互动。
 */
export function subscribeDeviceEvents(deviceId: string, onEvent: DeviceEventCallback): () => void {
  if (!hardwareApiEnabled || !deviceId || typeof EventSource === "undefined") return () => {};

  const url = `/api/devices/${encodeURIComponent(deviceId)}/events`;
  let connection = sharedConnections.get(deviceId);
  if (!connection) {
    const source = new EventSource(url);
    const callbacks = new Set<DeviceEventCallback>();
    connection = { source, callbacks };
    sharedConnections.set(deviceId, connection);
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          event?: HardwareInteractionEvent;
          telemetry?: DeviceTelemetry;
        };
        if (payload.event && payload.telemetry) {
          for (const callback of callbacks) callback(payload.event, payload.telemetry);
        }
      } catch {
        // Ignore malformed or stale hardware events.
      }
    };
  }
  connection.callbacks.add(onEvent);

  return () => {
    const active = sharedConnections.get(deviceId);
    if (!active) return;
    active.callbacks.delete(onEvent);
    if (active.callbacks.size === 0) {
      active.source.close();
      sharedConnections.delete(deviceId);
    }
  };
}

export async function fetchDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
  if (!hardwareApiEnabled) return null;
  const id = deviceId.trim();
  if (!id) return null;
  try {
    const response = await fetch(`/api/devices/${encodeURIComponent(id)}/status`);
    if (!response.ok) return null;
    const parsed = deviceStatusSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
