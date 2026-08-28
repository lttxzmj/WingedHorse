import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url().optional()
);

const isPlaceholder = (value: string) => /请替换|change-?me|replace-?me/iu.test(value);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3100),
    DATABASE_URL: optionalString.refine(
      (value) =>
        value === undefined || (/^postgres(?:ql)?:\/\//u.test(value) && !isPlaceholder(value)),
      "must be a PostgreSQL URL"
    ),
    PUBLIC_APP_URL: optionalUrl,
    OPENROUTER_API_KEY: optionalString,
    OPENROUTER_CHAT_MODEL: optionalString,
    OPENROUTER_SUMMARY_MODEL: optionalString,
    OPENROUTER_VISION_MODEL: optionalString,
    OPENROUTER_BASE_URL: optionalUrl,
    OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    MQTT_URL: optionalString.refine(
      (value) => value === undefined || /^mqtts?:\/\//u.test(value),
      "must be an MQTT URL"
    ),
    MQTT_USER: optionalString,
    MQTT_PASSWORD: optionalString
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && !environment.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "is required in production"
      });
    }
    if (environment.OPENROUTER_API_KEY && !environment.OPENROUTER_CHAT_MODEL) {
      context.addIssue({
        code: "custom",
        path: ["OPENROUTER_CHAT_MODEL"],
        message: "is required when OPENROUTER_API_KEY is configured"
      });
    }
    if (environment.OPENROUTER_API_KEY && isPlaceholder(environment.OPENROUTER_API_KEY)) {
      context.addIssue({
        code: "custom",
        path: ["OPENROUTER_API_KEY"],
        message: "must not be a template placeholder"
      });
    }
    if (environment.MQTT_PASSWORD && isPlaceholder(environment.MQTT_PASSWORD)) {
      context.addIssue({
        code: "custom",
        path: ["MQTT_PASSWORD"],
        message: "must not be a template placeholder"
      });
    }
    if (
      (environment.MQTT_USER && !environment.MQTT_PASSWORD) ||
      (!environment.MQTT_USER && environment.MQTT_PASSWORD)
    ) {
      context.addIssue({
        code: "custom",
        path: [environment.MQTT_USER ? "MQTT_PASSWORD" : "MQTT_USER"],
        message: "must be configured together with the other MQTT credential"
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const parsed = environmentSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "env"))];
  throw new Error(`Invalid server configuration: ${fields.join(", ")}`);
}
