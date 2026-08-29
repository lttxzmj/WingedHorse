import {
  lifeEventListSchema,
  lifeEventSchema,
  lifeSyncResponseSchema,
  type LifeEventCreateRequest,
  type LifeEventInteractionRequest,
  type LifeSyncRequest,
  type LifeSyncResponse
} from "@wingedhorse/contracts";
import type { LifeEvent } from "@wingedhorse/domain";

const VISITOR_TOKEN_KEY = "wingedhorse-visitor-capability-v1";

function createVisitorToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function getVisitorToken(): string {
  const existing = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (existing) return existing;
  const token = createVisitorToken();
  localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

export function hasVisitorToken(): boolean {
  return Boolean(localStorage.getItem(VISITOR_TOKEN_KEY));
}

export function visitorHeaders(accept?: string) {
  return {
    "Content-Type": "application/json",
    "X-WingedHorse-Visitor-Token": getVisitorToken(),
    ...(accept ? { Accept: accept } : {})
  };
}

function headers() {
  return visitorHeaders();
}

async function expectJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`LIFE_API_${response.status}`);
  return response.json();
}

export async function syncLifeEvents(localEvents: LifeEvent[]): Promise<LifeEvent[]> {
  await Promise.all(
    localEvents.map(
      async ({ eventKey, kind, occurredAt, typeId, itemId, liked, saved, visibility }) => {
        const body: LifeEventCreateRequest = {
          eventKey,
          kind,
          occurredAt,
          typeId,
          ...(itemId ? { itemId } : {}),
          ...(visibility ? { visibility } : {})
        };
        const response = await fetch("/api/life/events", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body)
        });
        const event = lifeEventSchema.parse(await expectJson(response));
        await Promise.all(
          (
            [
              ...(liked ? [{ interaction: "liked" as const, value: true }] : []),
              ...(saved ? [{ interaction: "saved" as const, value: true }] : [])
            ] satisfies LifeEventInteractionRequest[]
          ).map((request) => setLifeEventInteraction(event.id, request))
        );
      }
    )
  );
  const response = await fetch("/api/life/events?limit=30", { headers: headers() });
  return lifeEventListSchema.parse(await expectJson(response)).events;
}

export async function syncDigitalLife(request: LifeSyncRequest): Promise<LifeSyncResponse> {
  const response = await fetch("/api/life/sync", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(request)
  });
  return lifeSyncResponseSchema.parse(await expectJson(response));
}

export async function setLifeEventInteraction(id: string, request: LifeEventInteractionRequest) {
  const response = await fetch(`/api/life/events/${encodeURIComponent(id)}/interactions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(request)
  });
  return lifeEventSchema.parse(await expectJson(response));
}

export async function setRemoteLifeEventVisibility(
  id: string,
  visibility: LifeEvent["visibility"]
) {
  const response = await fetch(`/api/life/events/${encodeURIComponent(id)}/visibility`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ visibility })
  });
  return lifeEventSchema.parse(await expectJson(response));
}

export async function publishLifeEventVisibility(event: LifeEvent) {
  const body: LifeEventCreateRequest = {
    eventKey: event.eventKey,
    kind: event.kind,
    occurredAt: event.occurredAt,
    typeId: event.typeId,
    ...(event.itemId ? { itemId: event.itemId } : {}),
    visibility: event.visibility
  };
  const created = lifeEventSchema.parse(
    await expectJson(
      await fetch("/api/life/events", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body)
      })
    )
  );
  if (created.visibility === event.visibility) return created;
  return setRemoteLifeEventVisibility(created.id, event.visibility);
}

export async function deleteRemoteLifeData(): Promise<void> {
  if (!hasVisitorToken()) return;
  const response = await fetch("/api/account/data", { method: "DELETE", headers: headers() });
  await expectJson(response);
  localStorage.removeItem(VISITOR_TOKEN_KEY);
}
