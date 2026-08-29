import type { HorseTypeId } from "../assessment/types.js";
import type { PetVitals } from "../game/inventory.js";
import { appendLifeEvent, createLifeEvent, type LifeEvent } from "./life.js";

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";
export type LifeMotive = "recharge" | "momentum" | "decompress" | "explore" | "connect";
export type PlannedActivity =
  | "slow-breakfast"
  | "tidy-supplies"
  | "cloud-watch"
  | "map-walk"
  | "blanket-nap"
  | "write-postcard"
  | "practice-flight"
  | "evening-read";

export interface WorldContext {
  dateKey: string;
  period: DayPeriod;
  timezoneOffsetMinutes: number;
  localHour: number;
}

export interface DailyPlanSlot {
  id: string;
  scheduledAt: string;
  activity: PlannedActivity;
}

export interface DailyPlan {
  id: string;
  dateKey: string;
  motive: LifeMotive;
  slots: DailyPlanSlot[];
}

export interface DigitalLifeState {
  visitorId: string;
  typeId: HorseTypeId;
  world: WorldContext;
  plan: DailyPlan;
  events: LifeEvent[];
  updatedAt: string;
}

export interface AdvanceDigitalLifeInput {
  visitorId: string;
  typeId: HorseTypeId;
  now: string;
  timezoneOffsetMinutes: number;
  vitals: PetVitals;
  relationshipXp: number;
  events: LifeEvent[];
  previousPlan?: DailyPlan;
}

export interface AdvanceDigitalLifeResult extends DigitalLifeState {
  generatedEvents: LifeEvent[];
}

const activityPools: Record<LifeMotive, [PlannedActivity, ...PlannedActivity[]]> = {
  recharge: ["slow-breakfast", "blanket-nap", "cloud-watch", "evening-read"],
  momentum: ["tidy-supplies", "practice-flight", "write-postcard", "map-walk"],
  decompress: ["cloud-watch", "blanket-nap", "write-postcard", "slow-breakfast"],
  explore: ["map-walk", "practice-flight", "tidy-supplies", "cloud-watch"],
  connect: ["write-postcard", "tidy-supplies", "evening-read", "slow-breakfast"]
};

const horseTypes: HorseTypeId[] = [
  "chosen",
  "perpetual",
  "veteran",
  "explosive",
  "saving",
  "overthinker",
  "tired",
  "mad-literature"
];

const storyMilestones = [
  { day: 1, chapter: 1 as const },
  { day: 3, chapter: 2 as const },
  { day: 7, chapter: 3 as const }
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function localDate(now: Date, timezoneOffsetMinutes: number) {
  return new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateKey: string, toDateKey: string) {
  return Math.floor(
    (Date.parse(`${toDateKey}T00:00:00.000Z`) - Date.parse(`${fromDateKey}T00:00:00.000Z`)) /
      86_400_000
  );
}

function periodForHour(hour: number): DayPeriod {
  if (hour < 6 || hour >= 23) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function createWorldContext(nowValue: string, timezoneOffsetMinutes: number): WorldContext {
  const now = new Date(nowValue);
  if (Number.isNaN(now.getTime())) throw new Error("INVALID_WORLD_TIME");
  const offset = Math.max(-840, Math.min(840, Math.trunc(timezoneOffsetMinutes)));
  const local = localDate(now, offset);
  const localHour = local.getUTCHours();
  return {
    dateKey: dateKey(local),
    period: periodForHour(localHour),
    timezoneOffsetMinutes: offset,
    localHour
  };
}

export function selectLifeMotive(vitals: PetVitals, relationshipXp: number): LifeMotive {
  if (relationshipXp < 10) return "connect";
  const dimensions = [
    ["recharge", vitals.energy] as const,
    ["momentum", vitals.engine] as const,
    ["decompress", 100 - vitals.chaos] as const,
    ["explore", vitals.direction] as const
  ];
  return dimensions.reduce((lowest, current) => (current[1] < lowest[1] ? current : lowest))[0];
}

function scheduledAt(date: string, localHour: number, timezoneOffsetMinutes: number) {
  const utc = Date.parse(`${date}T${String(localHour).padStart(2, "0")}:00:00.000Z`);
  return new Date(utc + timezoneOffsetMinutes * 60_000).toISOString();
}

export function createDailyPlan(input: {
  visitorId: string;
  typeId: HorseTypeId;
  world: WorldContext;
  vitals: PetVitals;
  relationshipXp: number;
}): DailyPlan {
  const motive = selectLifeMotive(input.vitals, input.relationshipXp);
  const seed = stableHash(`${input.visitorId}:${input.world.dateKey}:${input.typeId}:${motive}`);
  const pool = activityPools[motive];
  const hours = [8, 13, 20];
  const slots = hours.map((hour, index) => {
    const activity = pool[(seed + index * 3) % pool.length] ?? pool[0];
    const id = `${input.world.dateKey}:${hour}:${activity}`;
    return {
      id,
      scheduledAt: scheduledAt(input.world.dateKey, hour, input.world.timezoneOffsetMinutes),
      activity
    };
  });
  return {
    id: `plan:${input.visitorId}:${input.world.dateKey}`,
    dateKey: input.world.dateKey,
    motive,
    slots
  };
}

export function advanceDigitalLife(input: AdvanceDigitalLifeInput): AdvanceDigitalLifeResult {
  const world = createWorldContext(input.now, input.timezoneOffsetMinutes);
  const plan =
    input.previousPlan?.dateKey === world.dateKey
      ? input.previousPlan
      : createDailyPlan({
          visitorId: input.visitorId,
          typeId: input.typeId,
          world,
          vitals: input.vitals,
          relationshipXp: input.relationshipXp
        });
  const nowMs = Date.parse(input.now);
  const plannedEvents = plan.slots
    .filter((slot) => Date.parse(slot.scheduledAt) <= nowMs)
    .map((slot) =>
      createLifeEvent({
        eventKey: `${plan.id}:${slot.id}`,
        kind: "autonomous",
        occurredAt: slot.scheduledAt,
        typeId: input.typeId,
        activity: slot.activity,
        motive: plan.motive,
        source: "daily-plan"
      })
    )
    .filter((event) => !input.events.some((existing) => existing.eventKey === event.eventKey));
  const arrival = [...input.events]
    .filter((event) => event.kind === "arrival")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
  const daysTogether = arrival
    ? Math.max(0, daysBetween(arrival.occurredAt.slice(0, 10), world.dateKey))
    : 0;
  const storyEvents = arrival
    ? storyMilestones
        .filter(({ day }) => day <= daysTogether)
        .map(({ day, chapter }) =>
          createLifeEvent({
            eventKey: `story:${arrival.eventKey}:${chapter}`,
            kind: "story",
            occurredAt: new Date(Date.parse(arrival.occurredAt) + day * 86_400_000).toISOString(),
            typeId: input.typeId,
            storyChapter: chapter,
            source: "life-engine"
          })
        )
        .filter(
          (event) =>
            Date.parse(event.occurredAt) <= nowMs &&
            !input.events.some((existing) => existing.eventKey === event.eventKey)
        )
    : [];
  const visitorCandidates = horseTypes.filter((typeId) => typeId !== input.typeId);
  const visitorTypeId =
    visitorCandidates[
      stableHash(`${input.visitorId}:${world.dateKey}:visitor`) % visitorCandidates.length
    ]!;
  const visitorDue =
    daysTogether >= 2 &&
    input.relationshipXp >= 10 &&
    world.localHour >= 14 &&
    stableHash(`${input.visitorId}:${world.dateKey}:visit-due`) % 3 === 0;
  const visitorEvent = createLifeEvent({
    eventKey: `visitor:${world.dateKey}:${visitorTypeId}`,
    kind: "visitor",
    occurredAt: input.now,
    typeId: input.typeId,
    visitorTypeId,
    source: "life-engine"
  });
  const visitorEvents =
    visitorDue && !input.events.some((existing) => existing.eventKey === visitorEvent.eventKey)
      ? [visitorEvent]
      : [];
  const generatedEvents = [...plannedEvents, ...storyEvents, ...visitorEvents];
  const events = generatedEvents.reduce(
    (current, event) => appendLifeEvent(current, event),
    input.events
  );
  return {
    visitorId: input.visitorId,
    typeId: input.typeId,
    world,
    plan,
    events,
    generatedEvents,
    updatedAt: input.now
  };
}
