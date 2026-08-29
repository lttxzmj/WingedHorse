import { isAnalyticsEventName, type AnalyticsEventName } from "@wingedhorse/domain";
import { visitorHeaders } from "./lifeApi";

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
  if (typeof fetch === "function") {
    void fetch(endpoint, {
      method: "POST",
      headers: visitorHeaders(),
      body,
      keepalive: true
    }).catch(() => undefined);
  }
}
