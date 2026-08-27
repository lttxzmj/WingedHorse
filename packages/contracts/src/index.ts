import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.iso.datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

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
  easterEggs: z.array(z.string())
});

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
export type AssessmentResultResponse = z.infer<typeof assessmentResultSchema>;

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
  moodHint: z.enum(["good", "flat", "tired", "anxious", "sad"]).optional()
});

export const companionResponseSchema = z.object({
  reply: z.string(),
  source: z.enum(["openrouter", "local-fallback", "safety-flow"]),
  safetyLevel: z.enum(["normal", "concern", "urgent"]),
  aiDisclosure: z.literal(true),
  memoryCandidate: z.string().nullable()
});

export type CompanionMessageRequest = z.infer<typeof companionMessageSchema>;
export type CompanionMessageResponse = z.infer<typeof companionResponseSchema>;

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
  online: z.boolean(),
  env: z
    .object({
      temperatureC: z.number().optional(),
      humidityPct: z.number().optional()
    })
    .optional(),
  heartTrend: z.enum(["calm", "active", "elevated"]).optional()
});

export type DeviceEffectRequest = z.infer<typeof deviceEffectRequestSchema>;
export type DeviceEffect = z.infer<typeof deviceEffectSchema>;
export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>;
