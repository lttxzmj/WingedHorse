import { useEffect, useState } from "react";
import { standFaceFromVitals, type StandFaceMood } from "@wingedhorse/domain";
import { subscribeDeviceEvents } from "../lib/devices";
import { trackEvent } from "../lib/analytics";
import { useAppStore } from "../store/useAppStore";
import { LailaiStandFace } from "./LailaiStandFace";

export function GlobalHardwareListener() {
  const deviceId = useAppStore((state) => state.deviceId);
  const hardwareLink = useAppStore((state) => state.hardwareLink);
  const clockIn = useAppStore((state) => state.clockIn);
  const [faceMood, setFaceMood] = useState<StandFaceMood | null>(null);

  useEffect(() => {
    const targetDeviceId = deviceId.trim();
    if (!hardwareLink || !targetDeviceId) return;
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event, telemetry) => {
      const isGaming = window.location.pathname.includes("/game");
      if (event.type === "worker_presence") {
        clockIn();
        setFaceMood(standFaceFromVitals(useAppStore.getState().petVitals.energy, false));
        trackEvent("stand_face_show", { mood: "on-duty" });
        trackEvent("clock_in", { source: "hardware" });
        return;
      }
      if (isGaming && telemetry.obstacle) {
        setFaceMood("stealth");
        trackEvent("stand_face_show", { mood: "stealth" });
      }
    });
    return unsubscribe;
  }, [clockIn, deviceId, hardwareLink]);

  if (!faceMood) return null;
  return <LailaiStandFace mood={faceMood} onClose={() => setFaceMood(null)} />;
}
