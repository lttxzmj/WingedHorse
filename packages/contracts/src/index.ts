import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.iso.datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const analyticsEventSchema = z.object({
  name: z.enum([
    "landing_view",
    "assessment_start",
    "assessment_complete",
    "home_view",
    "game_start",
    "game_finish",
    "sponsored_shown",
    "sponsored_caught",
    "welfare_opened",
    "clock_in",
    "clock_out",
    "comic_share",
    "stand_face_show",
    "intent_submit"
  ]),
  occurredAt: z.iso.datetime(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export type AnalyticsEventPayload = z.infer<typeof analyticsEventSchema>;

export const assessmentSubmissionSchema = z.object({
  questionSetId: z.string().min(1),
  questionSetVersion: z.string().min(1),
  answers: z.record(z.string(), z.string())
});

export const dimensionScoresSchema = z.object({
  energy: z.number(),
  engine: z.number(),
  chaos: z.number(),
  direction: z.number()
});

export const assessmentResultSchema = z.object({
  id: z.string(),
  questionSetId: z.string(),
  questionSetVersion: z.string(),
  rawScores: dimensionScoresSchema,
  normalizedScores: dimensionScoresSchema,
  typeId: z.enum([
    "chosen",
    "perpetual",
    "veteran",
    "explosive",
    "saving",
    "overthinker",
    "tired",
    "mad-literature"
  ]),
  edgeDimensions: z.array(z.enum(["energy", "engine", "chaos", "direction"])),
  easterEggs: z.array(z.string()),
  bloodline: z.object({
    purity: z.number().int().min(55).max(100),
    hidden: z.array(
      z.object({
        typeId: z.enum([
          "chosen",
          "perpetual",
          "veteran",
          "explosive",
          "saving",
          "overthinker",
          "tired",
          "mad-literature"
        ]),
        percentage: z.number().int().min(1).max(45)
      })
    )
  }),
  directionHint: z.enum(["needs-direction", "clear-direction"])
});

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
export type AssessmentResultResponse = z.infer<typeof assessmentResultSchema>;

export const horseTypeIdSchema = z.enum([
  "chosen",
  "perpetual",
  "veteran",
  "explosive",
  "saving",
  "overthinker",
  "tired",
  "mad-literature"
]);
export const visitorTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);

export const petVitalsSchema = z.object({
  energy: z.number().min(0).max(100),
  engine: z.number().min(0).max(100),
  chaos: z.number().min(0).max(100),
  direction: z.number().min(0).max(100)
});

export const lifeMotiveSchema = z.enum([
  "recharge",
  "momentum",
  "decompress",
  "explore",
  "connect"
]);
export const plannedActivitySchema = z.enum([
  "slow-breakfast",
  "tidy-supplies",
  "cloud-watch",
  "map-walk",
  "blanket-nap",
  "write-postcard",
  "practice-flight",
  "evening-read"
]);
export const lifeEventKindSchema = z.enum([
  "arrival",
  "game-haul",
  "gift",
  "quiet-moment",
  "autonomous",
  "visitor",
  "story"
]);
export const lifeEventItemIdSchema = z.enum([
  "iced-americano",
  "nap-mask",
  "off-work-barrier",
  "steering-wheel-charm",
  "main-quest-note",
  "refusal-script",
  "screaming-chicken",
  "mad-note",
  "emotion-valve",
  "compass",
  "mentor-card",
  "sponsored-tent-skin",
  "sponsored-coffee-coupon"
]);
export const lifeEventCreateSchema = z.object({
  eventKey: z.string().trim().min(1).max(180),
  kind: lifeEventKindSchema,
  occurredAt: z.iso.datetime(),
  typeId: horseTypeIdSchema,
  itemId: lifeEventItemIdSchema.optional(),
  activity: plannedActivitySchema.optional(),
  motive: lifeMotiveSchema.optional(),
  visitorTypeId: horseTypeIdSchema.optional(),
  storyChapter: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  source: z.enum(["user-action", "daily-plan", "life-engine"]).optional()
});
export const lifeEventSchema = lifeEventCreateSchema.extend({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  source: z.enum(["user-action", "daily-plan", "life-engine"]).default("user-action"),
  liked: z.boolean(),
  saved: z.boolean()
});
export const lifeEventInteractionSchema = z.object({
  interaction: z.enum(["liked", "saved"]),
  value: z.boolean()
});
export const lifeEventListSchema = z.object({
  events: z.array(lifeEventSchema),
  nextCursor: z.string().nullable()
});
export const dailyPlanSchema = z.object({
  id: z.string(),
  dateKey: z.iso.date(),
  motive: lifeMotiveSchema,
  slots: z.array(
    z.object({
      id: z.string(),
      scheduledAt: z.iso.datetime(),
      activity: plannedActivitySchema
    })
  )
});
export const worldContextSchema = z.object({
  dateKey: z.iso.date(),
  period: z.enum(["morning", "afternoon", "evening", "night"]),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  localHour: z.number().int().min(0).max(23)
});
export const lifeSyncRequestSchema = z.object({
  typeId: horseTypeIdSchema,
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  vitals: petVitalsSchema,
  relationshipXp: z.number().int().min(0).max(999),
  clientEvents: z.array(lifeEventSchema).max(30).default([])
});
export const lifeSyncResponseSchema = z.object({
  typeId: horseTypeIdSchema,
  world: worldContextSchema,
  plan: dailyPlanSchema,
  events: z.array(lifeEventSchema).max(30),
  generatedEventIds: z.array(z.string())
});
export type LifeSyncRequest = z.infer<typeof lifeSyncRequestSchema>;
export type LifeSyncResponse = z.infer<typeof lifeSyncResponseSchema>;
export type LifeEventCreateRequest = z.infer<typeof lifeEventCreateSchema>;
export type LifeEventResponse = z.infer<typeof lifeEventSchema>;
export type LifeEventInteractionRequest = z.infer<typeof lifeEventInteractionSchema>;
export type LifeEventListResponse = z.infer<typeof lifeEventListSchema>;

export const inventorySchema = z.partialRecord(
  lifeEventItemIdSchema,
  z.number().int().min(1).max(99)
);
export const playerStateSchema = z.object({
  inventory: inventorySchema,
  vitals: petVitalsSchema,
  gamesPlayed: z.number().int().min(0).max(1_000_000),
  relationshipXp: z.number().int().min(0).max(999),
  revision: z.number().int().min(0)
});
export const gameSessionStartSchema = z.object({
  typeId: horseTypeIdSchema,
  bootstrap: playerStateSchema.omit({ revision: true }).optional()
});
export const gameSessionSchema = z.object({
  sessionId: z.string().min(16).max(80),
  startedAt: z.iso.datetime(),
  durationSeconds: z.literal(30),
  player: playerStateSchema
});
export const gameSettlementSchema = z.object({
  score: z.number().int().min(0).max(100_000),
  caught: inventorySchema.refine(
    (inventory) => Object.values(inventory).reduce((sum, count) => sum + count, 0) <= 50,
    "TOO_MANY_CAUGHT_ITEMS"
  )
});
export const gameSettlementResponseSchema = z.object({
  sessionId: z.string(),
  alreadySettled: z.boolean(),
  player: playerStateSchema
});
export const consumePlayerItemSchema = z.object({ itemId: lifeEventItemIdSchema });

export type PlayerStateResponse = z.infer<typeof playerStateSchema>;
export type GameSessionStartRequest = z.infer<typeof gameSessionStartSchema>;
export type GameSessionResponse = z.infer<typeof gameSessionSchema>;
export type GameSettlementRequest = z.infer<typeof gameSettlementSchema>;
export type GameSettlementResponse = z.infer<typeof gameSettlementResponseSchema>;
export type ConsumePlayerItemRequest = z.infer<typeof consumePlayerItemSchema>;

export const companionMessageSchema = z.object({
  sessionId: z.string().min(8).max(128),
  message: z.string().trim().min(1).max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200)
      })
    )
    .max(12)
    .default([]),
  memories: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
  memoryEnabled: z.boolean().default(false),
  /** 当前测评状态/皮肤；无完整 lifeContext 时也应用来匹配语气。 */
  typeId: horseTypeIdSchema.optional(),
  moodHint: z.enum(["good", "flat", "tired", "anxious", "sad"]).optional(),
  lifeContext: z
    .object({
      typeId: horseTypeIdSchema,
      world: worldContextSchema,
      plan: dailyPlanSchema,
      vitals: petVitalsSchema,
      relationshipXp: z.number().int().min(0).max(999),
      recentEvents: z
        .array(lifeEventSchema.pick({ title: true, body: true, occurredAt: true }))
        .max(6),
      inventory: z
        .array(z.object({ name: z.string().max(40), count: z.number().int().positive() }))
        .max(12)
    })
    .optional()
});

export const companionResponseSchema = z.object({
  reply: z.string().trim().min(1).max(1200),
  source: z.enum(["openrouter", "local-fallback", "safety-flow", "domain-grounded"]),
  safetyLevel: z.enum(["normal", "concern", "urgent"]),
  aiDisclosure: z.literal(true),
  memoryCandidate: z.string().nullable()
});

export const companionStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), delta: z.string().min(1).max(1200) }),
  z.object({ type: z.literal("replace"), content: z.string().trim().min(1).max(1200) }),
  z.object({ type: z.literal("done"), response: companionResponseSchema })
]);

export const companionRateLimitErrorSchema = z
  .object({
    code: z.literal("COMPANION_RATE_LIMITED"),
    message: z.string().max(120),
    retryAfterSeconds: z.number().int().min(1).max(60)
  })
  .passthrough();

export type CompanionMessageRequest = z.infer<typeof companionMessageSchema>;
export type CompanionMessageResponse = z.infer<typeof companionResponseSchema>;
export type CompanionStreamEvent = z.infer<typeof companionStreamEventSchema>;

export const moodIdSchema = z.enum(["good", "flat", "tired", "anxious", "sad"]);
export type MoodId = z.infer<typeof moodIdSchema>;

export const lightEffectSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brightness: z.number().int().min(0).max(100),
  animation: z.enum(["off", "steady", "breathe", "pulse", "flow", "rainbow"])
});

export const deviceEffectRequestSchema = z.object({
  deviceId: z.string().trim().min(1).max(64),
  mood: moodIdSchema
});

export const deviceEffectSchema = z.object({
  seq: z.number().int().nonnegative(),
  mood: moodIdSchema,
  effect: lightEffectSchema,
  ts: z.iso.datetime()
});

export const deviceTelemetrySchema = z.object({
  deviceId: z.string().trim().min(1).max(64),
  online: z.boolean().optional(),
  // 硬件传感器数据
  obstacle: z.boolean().optional(),
  pressure: z.number().optional(),
  hasPress: z.boolean().optional(),
  led1: z.union([z.enum(["on", "off", "blinking"]), z.string()]).optional(),
  led2: z.union([z.enum(["on", "off", "breathing"]), z.string()]).optional(),
  dht: z
    .object({
      temperature: z.number().nullable().optional(),
      humidity: z.number().nullable().optional()
    })
    .optional(),
  // 智能推导/业务事件
  eventType: z.enum(["proximity", "touch", "boss_alert", "climate", "idle"]).optional(),
  env: z
    .object({
      temperatureC: z.number().nullable().optional(),
      humidityPct: z.number().nullable().optional()
    })
    .optional(),
  heartTrend: z.enum(["calm", "active", "elevated"]).optional(),
  timestamp: z.number().optional()
});

export const companionQuotaSchema = z.object({
  limit: z.number().int().min(0).max(500),
  used: z.number().int().min(0).max(500),
  remaining: z.number().int().min(0).max(500),
  resetsAt: z.iso.datetime()
});
export type CompanionQuota = z.infer<typeof companionQuotaSchema>;

export const purchaseIntentSchema = z.object({
  contact: z.string().trim().min(2).max(80)
});
export type PurchaseIntentRequest = z.infer<typeof purchaseIntentSchema>;

export const deviceStatusSchema = z.object({
  deviceId: z.string().trim().min(1).max(64),
  online: z.boolean(),
  lastSeenAt: z.iso.datetime().nullable()
});
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export type DeviceEffectRequest = z.infer<typeof deviceEffectRequestSchema>;
export type DeviceEffect = z.infer<typeof deviceEffectSchema>;
export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>;
