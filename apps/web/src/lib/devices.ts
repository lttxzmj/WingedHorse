import type { MoodId } from "@wingedhorse/domain";

/**
 * 把心情下发到已配对的硬件设备（经服务端 → MQTT → 设备）。
 * 仅在用户开启「联动硬件」且填写设备 ID 后调用；失败静默忽略，不影响主流程。
 */
export async function sendMoodToDevice(deviceId: string, mood: MoodId): Promise<void> {
  try {
    await fetch(`/api/devices/${encodeURIComponent(deviceId)}/effects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood })
    });
  } catch {
    // 弱网或服务不可用时忽略
  }
}
