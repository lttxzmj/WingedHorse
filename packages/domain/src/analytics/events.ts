export const ANALYTICS_EVENT_NAMES = [
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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: string;
  props?: Readonly<Record<string, string | number | boolean>>;
}

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}
