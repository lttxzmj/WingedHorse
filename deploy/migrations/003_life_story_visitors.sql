BEGIN;

ALTER TABLE life_events
  ADD COLUMN IF NOT EXISTS visitor_type_id TEXT,
  ADD COLUMN IF NOT EXISTS story_chapter SMALLINT;

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_kind_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_kind_check
  CHECK (kind IN ('arrival', 'game-haul', 'gift', 'quiet-moment', 'autonomous', 'visitor', 'story'));

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_source_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_source_check
  CHECK (source IN ('user-action', 'daily-plan', 'life-engine'));

ALTER TABLE life_events DROP CONSTRAINT IF EXISTS life_events_story_chapter_check;
ALTER TABLE life_events
  ADD CONSTRAINT life_events_story_chapter_check
  CHECK (story_chapter IN (1, 2, 3));

COMMIT;
