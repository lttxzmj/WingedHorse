import type { HorseTypeId } from "../assessment/types.js";
import { ITEM_CATALOG, type ItemId } from "../game/items.js";

import type { LifeMotive, PlannedActivity } from "./engine.js";

export type LifeEventKind =
  "arrival" | "game-haul" | "gift" | "quiet-moment" | "autonomous" | "visitor" | "story";
export type LifeEventSource = "user-action" | "daily-plan" | "life-engine";
/** 朋友圈逐条可见范围；默认仅自己，不做广场。 */
export type LifeEventVisibility = "private" | "friends";

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
  visitorTypeId?: HorseTypeId | undefined;
  storyChapter?: 1 | 2 | 3 | undefined;
  source: LifeEventSource;
  visibility: LifeEventVisibility;
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
  visitorTypeId?: HorseTypeId | undefined;
  storyChapter?: 1 | 2 | 3 | undefined;
  source?: LifeEventSource | undefined;
  visibility?: LifeEventVisibility | undefined;
}

const copy: Record<
  LifeEventKind,
  (input: CreateLifeEventInput) => Pick<LifeEvent, "title" | "body">
> = {
  arrival: () => ({
    title: "新住客到达草原",
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
    title: "草原安静了十秒",
    body: "你们谁也没催谁。风吹过鬃毛，这十秒也被算进了共同生活。"
  }),
  autonomous: (input) => {
    const content: Record<PlannedActivity, Pick<LifeEvent, "title" | "body">> = {
      "slow-breakfast": {
        title: "早餐吃得比闹钟慢一点",
        body: "它把最后一口留到阳光照进草原时才吃完，今天决定不抢跑。"
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
        body: "草原安静了好一阵。醒来以后，它郑重宣布休息也算今日事项。"
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
  },
  visitor: (input) => ({
    title: "一位 AI 牛马来草原坐了坐",
    body: input.visitorTypeId
      ? "它带来一张写着‘今天不用互相证明什么’的小卡片，聊完便自己回去了。"
      : "访客在帐篷边坐了一会儿，没有打扰你们原本的节奏。"
  }),
  story: (input) => {
    const chapters = {
      1: {
        title: "帐篷里多了一盏小灯",
        body: "它说这盏灯不是用来催你回来的，只是想让你知道：晚一点也有人给你留着位置。"
      },
      2: {
        title: "你们写下第一张远行手账",
        body: "手账没有终点，只记了补给雨、安静角落和一条随时可以折返的小路。"
      },
      3: {
        title: "翅膀第一次留下完整影子",
        body: "它没有急着起飞。你们决定先把这一刻记下来，等真正想出发时再一起走。"
      }
    } as const;
    return chapters[input.storyChapter ?? 1];
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
    visibility: input.visibility ?? "private",
    ...(input.itemId ? { itemId: input.itemId } : {}),
    ...(input.activity ? { activity: input.activity } : {}),
    ...(input.motive ? { motive: input.motive } : {}),
    ...(input.visitorTypeId ? { visitorTypeId: input.visitorTypeId } : {}),
    ...(input.storyChapter ? { storyChapter: input.storyChapter } : {}),
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

export function normalizeLifeEventVisibility(value: unknown): LifeEventVisibility {
  return value === "friends" ? "friends" : "private";
}

export function setLifeEventVisibility(
  events: LifeEvent[],
  id: string,
  visibility: LifeEventVisibility
): LifeEvent[] {
  return events.map((event) => (event.id === id ? { ...event, visibility } : event));
}

export function lifeEventsVisibleToFriends(events: readonly LifeEvent[]): LifeEvent[] {
  return events.filter((event) => event.visibility === "friends");
}
