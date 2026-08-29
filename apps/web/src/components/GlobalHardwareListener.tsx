import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { standFaceFromVitals, type StandFaceMood } from "@wingedhorse/domain";
import { subscribeDeviceEvents } from "../lib/devices";
import { trackEvent } from "../lib/analytics";
import { useAppStore } from "../store/useAppStore";
import { LailaiStandFace } from "./LailaiStandFace";

export function GlobalHardwareListener() {
  const deviceId = useAppStore((state) => state.deviceId);
  const energy = useAppStore((state) => state.petVitals.energy);
  const clockIn = useAppStore((state) => state.clockIn);
  const location = useLocation();
  const [faceMood, setFaceMood] = useState<StandFaceMood | null>(null);

  useEffect(() => {
    const targetDeviceId = deviceId || "lamp-001";
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event, telemetry) => {
      const isGaming = location.pathname.includes("/game");
      if (event.type === "worker_presence") {
        clockIn();
        setFaceMood(standFaceFromVitals(energy, false));
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
  }, [clockIn, deviceId, energy, location.pathname]);

  if (!faceMood) return null;
  return <LailaiStandFace mood={faceMood} onClose={() => setFaceMood(null)} />;
}
