BEGIN;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  visitor_hash TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_name_received_idx
  ON analytics_events (name, received_at DESC);

CREATE TABLE IF NOT EXISTS purchase_intents (
  id BIGSERIAL PRIMARY KEY,
  contact TEXT NOT NULL,
  visitor_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_intents_created_idx
  ON purchase_intents (created_at DESC);

COMMIT;
