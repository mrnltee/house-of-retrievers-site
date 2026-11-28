-- Minor sponsor level (owner, 2026-11-28): widen the event sponsor categories.
-- Existing levels remain valid; NULL still means no level.
ALTER TABLE event_brands DROP CONSTRAINT IF EXISTS event_brands_sponsor_level_check;
ALTER TABLE event_brands ADD CONSTRAINT event_brands_sponsor_level_check
  CHECK (sponsor_level IS NULL OR sponsor_level IN ('presenting', 'major', 'supporting', 'minor'));
