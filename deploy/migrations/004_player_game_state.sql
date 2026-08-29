BEGIN;

CREATE TABLE IF NOT EXISTS player_states (
  actor_hash TEXT PRIMARY KEY,
  inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
  vitals JSONB NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  relationship_xp INTEGER NOT NULL DEFAULT 0 CHECK (relationship_xp BETWEEN 0 AND 999),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  actor_hash TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 30 CHECK (duration_seconds = 30),
  settled_at TIMESTAMPTZ,
  settlement JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_hash, session_id)
);

CREATE INDEX IF NOT EXISTS game_sessions_actor_started_idx
  ON game_sessions (actor_hash, started_at DESC);

COMMIT;
