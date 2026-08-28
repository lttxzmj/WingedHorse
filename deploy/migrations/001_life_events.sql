BEGIN;

CREATE TABLE IF NOT EXISTS life_events (
  actor_hash TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('arrival', 'game-haul', 'gift', 'quiet-moment')),
  occurred_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type_id TEXT NOT NULL,
  item_id TEXT,
  liked BOOLEAN NOT NULL DEFAULT FALSE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_hash, event_id),
  UNIQUE (actor_hash, event_key)
);

CREATE INDEX IF NOT EXISTS life_events_actor_timeline_idx
  ON life_events (actor_hash, occurred_at DESC, event_id DESC);

COMMIT;
