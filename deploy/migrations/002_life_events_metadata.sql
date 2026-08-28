BEGIN;

ALTER TABLE life_events
  ADD COLUMN IF NOT EXISTS activity TEXT,
  ADD COLUMN IF NOT EXISTS motive TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user-action';

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_kind_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_kind_check
  CHECK (kind IN ('arrival', 'game-haul', 'gift', 'quiet-moment', 'autonomous'));

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_source_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_source_check
  CHECK (source IN ('user-action', 'daily-plan'));

CREATE TABLE IF NOT EXISTS digital_life_plans (
  actor_hash TEXT PRIMARY KEY,
  plan JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
