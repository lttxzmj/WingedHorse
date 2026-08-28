import type { MoodId, HardwareInteractionEvent } from "@wingedhorse/domain";
import type { DeviceTelemetry } from "@wingedhorse/contracts";

/**
 * 把心情下发到已配对的硬件设备（经服务端 → MQTT → 设备）。
 * 仅在用户开启「联动硬件」且填写设备 ID 后调用；失败静默忽略，不影响主流程。
 */
export async function sendMoodToDevice(deviceId: string, mood: MoodId): Promise<void> {
  try {
    const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/effects`, {
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
export function subscribeDeviceEvents(
  deviceId: string,
  onEvent: (event: HardwareInteractionEvent, telemetry: DeviceTelemetry) => void
): () => void {
  if (!deviceId || typeof EventSource === "undefined") return () => {};

  const url = `/api/devices/${encodeURIComponent(deviceId)}/events`;
  console.log(`[subscribeDeviceEvents] 正在开启 SSE 连接 -> ${url}`);
  const es = new EventSource(url);

  es.onopen = () => {
    console.log(`[subscribeDeviceEvents] 🟢 SSE 通道已连接成功: ${url}`);
  };

  es.onmessage = (event) => {
    try {
      console.log(`[subscribeDeviceEvents] 📩 收到 SSE 事件原始数据:`, event.data);
      const payload = JSON.parse(event.data);
      if (payload?.event || payload?.telemetry) {
        onEvent(payload.event, payload.telemetry || payload);
      }
    } catch (err) {
      console.error("[subscribeDeviceEvents] 无法解析 SSE 数据:", err);
    }
  };

  es.onerror = (err) => {
    console.warn(`[subscribeDeviceEvents] ⚠️ SSE 连接异常，准备重连...`, err);
  };

  return () => {
    es.close();
  };
}
