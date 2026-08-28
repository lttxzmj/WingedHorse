import {
  gameSessionSchema,
  gameSettlementResponseSchema,
  playerStateSchema,
  type GameSessionStartRequest,
  type GameSettlementRequest
} from "@wingedhorse/contracts";
import type { ItemId } from "@wingedhorse/domain";
import { getVisitorToken } from "./lifeApi";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-WingedHorse-Visitor-Token": getVisitorToken()
  };
}

async function json(response: Response) {
  if (!response.ok) throw new Error(`PLAYER_API_${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function startCloudGame(request: GameSessionStartRequest) {
  const response = await fetch("/api/game/sessions", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(request)
  });
  return gameSessionSchema.parse(await json(response));
}

export async function settleCloudGame(sessionId: string, request: GameSettlementRequest) {
  const response = await fetch(`/api/game/sessions/${encodeURIComponent(sessionId)}/settle`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(request)
  });
  return gameSettlementResponseSchema.parse(await json(response));
}

export async function consumeCloudItem(itemId: ItemId) {
  const response = await fetch("/api/player/items/consume", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ itemId })
  });
  return playerStateSchema.parse(await json(response));
}
