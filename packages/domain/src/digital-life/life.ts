import type { HorseTypeId } from "../assessment/types.js";
import { ITEM_CATALOG, type ItemId } from "../game/items.js";

import type { LifeMotive, PlannedActivity } from "./engine.js";

export type LifeEventKind = "arrival" | "game-haul" | "gift" | "quiet-moment" | "autonomous";
export type LifeEventSource = "user-action" | "daily-plan";

export interface LifeEvent {
  id: string;
  eventKey: string;
  kind: LifeEventKind;
  occurredAt: string;
  title: string;
  body: string;
  typeId: HorseTypeId;
  itemId?: ItemId | undefined;
  activity?: PlannedActivity | undefined;
  motive?: LifeMotive | undefined;
  source: LifeEventSource;
  liked: boolean;
  saved: boolean;
}

export interface CreateLifeEventInput {
  eventKey: string;
  kind: LifeEventKind;
  occurredAt: string;
  typeId: HorseTypeId;
  itemId?: ItemId | undefined;
  activity?: PlannedActivity | undefined;
  motive?: LifeMotive | undefined;
  source?: LifeEventSource | undefined;
}

const copy: Record<
  LifeEventKind,
  (input: CreateLifeEventInput) => Pick<LifeEvent, "title" | "body">
> = {
  arrival: () => ({
    title: "新住客到达草坪",
    body: "它绕着帐篷看了一圈，把这里当作暂时不用逞强的地方。"
  }),
  "game-haul": () => ({
    title: "补给雨顺利收工",
    body: "接住多少都算收获。它把补给认真分好，留了一份等你回来。"
  }),
  gift: (input) => ({
    title: `收到一份${input.itemId ? ITEM_CATALOG[input.itemId].name : "补给"}`,
    body: "它没有立刻用掉，而是先朝你点了点头：被惦记到的感觉，比数值更暖一点。"
  }),
  "quiet-moment": () => ({
    title: "草坪安静了十秒",
    body: "你们谁也没催谁。风吹过鬃毛，这十秒也被算进了共同生活。"
  }),
  autonomous: (input) => {
    const content: Record<PlannedActivity, Pick<LifeEvent, "title" | "body">> = {
      "slow-breakfast": {
        title: "早餐吃得比闹钟慢一点",
        body: "它把最后一口留到阳光照进草坪时才吃完，今天决定不抢跑。"
      },
      "tidy-supplies": {
        title: "把补给重新排了一遍",
        body: "它认真分出现在要用的和以后再说的，桌面终于空出一小块。"
      },
      "cloud-watch": {
        title: "研究了一会儿云的路线",
        body: "没有得出结论，但它觉得偶尔不知道去哪里，也可以先看看天。"
      },
      "map-walk": {
        title: "沿着地图走了一个小圈",
        body: "它没有找到捷径，却记住了一条下次还愿意再走的路。"
      },
      "blanket-nap": {
        title: "把自己卷进毯子里",
        body: "草坪安静了好一阵。醒来以后，它郑重宣布休息也算今日事项。"
      },
      "write-postcard": {
        title: "写了一张没有地址的小纸条",
        body: "它先把纸条夹进书里，准备等你回来再决定要不要递出去。"
      },
      "practice-flight": {
        title: "偷偷练了三次起飞",
        body: "前两次只扬起了草屑，第三次离地一点点，已经值得记下来。"
      },
      "evening-read": {
        title: "在帐篷口读到天色变暗",
        body: "它把有意思的那一页折了个角，想等你回来一起看。"
      }
    };
    return content[input.activity ?? "cloud-watch"];
  }
};

function stableId(eventKey: string) {
  let hash = 2166136261;
  for (const char of eventKey) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `life-${(hash >>> 0).toString(36)}`;
}

export function createLifeEvent(input: CreateLifeEventInput): LifeEvent {
  const eventCopy = copy[input.kind](input);
  return {
    id: stableId(input.eventKey),
    eventKey: input.eventKey,
    kind: input.kind,
    occurredAt: input.occurredAt,
    typeId: input.typeId,
    source: input.source ?? "user-action",
    ...(input.itemId ? { itemId: input.itemId } : {}),
    ...(input.activity ? { activity: input.activity } : {}),
    ...(input.motive ? { motive: input.motive } : {}),
    ...eventCopy,
    liked: false,
    saved: false
  };
}

export function appendLifeEvent(events: LifeEvent[], event: LifeEvent, limit = 30): LifeEvent[] {
  if (events.some((item) => item.eventKey === event.eventKey)) return events;
  return [event, ...events].slice(0, limit);
}

export function toggleLifeEventInteraction(
  events: LifeEvent[],
  id: string,
  interaction: "liked" | "saved"
): LifeEvent[] {
  return events.map((event) =>
    event.id === id ? { ...event, [interaction]: !event[interaction] } : event
  );
}
