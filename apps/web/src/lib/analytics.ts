import { isAnalyticsEventName, type AnalyticsEventName } from "@wingedhorse/domain";

const endpoint = "/api/events";

export function trackEvent(
  name: AnalyticsEventName,
  props?: Readonly<Record<string, string | number | boolean>>
) {
  if (!isAnalyticsEventName(name)) return;
  const payload = {
    name,
    occurredAt: new Date().toISOString(),
    ...(props ? { props } : {})
  };
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    /* keep going to fetch */
  }
  if (typeof fetch === "function") {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => undefined);
  }
}
