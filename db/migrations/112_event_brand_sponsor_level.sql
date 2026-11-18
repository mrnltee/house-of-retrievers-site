-- Sponsor level per event (owner, 2026-11-18): a sponsor on an event's Brand tracker can be a presenting,
-- major or supporting sponsor. NULL = a sponsor with no level (and every partner). Additive only.
ALTER TABLE event_brands ADD COLUMN IF NOT EXISTS sponsor_level text;
DO $$ BEGIN
  ALTER TABLE event_brands ADD CONSTRAINT event_brands_sponsor_level_check
    CHECK (sponsor_level IS NULL OR sponsor_level IN ('presenting', 'major', 'supporting'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
