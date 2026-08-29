import { useEffect, useState } from "react";
import { syncDigitalLife } from "../lib/lifeApi";
import { useAppStore } from "../store/useAppStore";

export type LifeSyncState = "idle" | "syncing" | "synced" | "offline";

export function useDigitalLife() {
  const result = useAppStore((state) => state.result);
  const lifeSyncEnabled = useAppStore((state) => state.lifeSyncEnabled);
  const petVitals = useAppStore((state) => state.petVitals);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const advanceLife = useAppStore((state) => state.advanceLife);
  const applyLifeSync = useAppStore((state) => state.applyLifeSync);
  const [syncState, setSyncState] = useState<LifeSyncState>("idle");
  const eventSignature = lifeEvents
    .map((event) => `${event.eventKey}:${event.liked}:${event.saved}`)
    .join("|");

  useEffect(() => {
    if (result) advanceLife(new Date().toISOString(), new Date().getTimezoneOffset());
  }, [advanceLife, result]);

  useEffect(() => {
    if (!lifeSyncEnabled || !result) {
      setSyncState("idle");
      return;
    }
    let active = true;
    const snapshot = useAppStore.getState();
    setSyncState("syncing");
    void syncDigitalLife({
      typeId: result.typeId,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      vitals: petVitals,
      relationshipXp,
      clientEvents: snapshot.lifeEvents
    })
      .then((remote) => {
        if (!active) return;
        applyLifeSync(remote.plan, remote.world, remote.events);
        setSyncState("synced");
      })
      .catch(() => {
        if (active) setSyncState("offline");
      });
    return () => {
      active = false;
    };
  }, [applyLifeSync, eventSignature, lifeSyncEnabled, petVitals, relationshipXp, result]);

  return { syncState, lifeSyncEnabled };
}
