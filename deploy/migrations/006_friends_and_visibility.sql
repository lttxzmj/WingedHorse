BEGIN;

ALTER TABLE life_events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_visibility_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_visibility_check
  CHECK (visibility IN ('private', 'friends'));

CREATE INDEX IF NOT EXISTS life_events_actor_visibility_timeline_idx
  ON life_events (actor_hash, visibility, occurred_at DESC, event_id DESC);

CREATE TABLE IF NOT EXISTS visitor_profiles (
  actor_hash TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friendships (
  actor_low TEXT NOT NULL,
  actor_high TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_low, actor_high),
  CHECK (actor_low < actor_high)
);

CREATE INDEX IF NOT EXISTS friendships_high_idx ON friendships (actor_high);

COMMIT;
