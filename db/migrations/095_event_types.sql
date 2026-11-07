-- Event types (owner, 2026-11-07): besides fundraising / charity events (the
-- existing behaviour), HOR runs playdates: a social activity for pets and their
-- people, one-off or every last Sunday of the month.
--   standard         the existing kind of event (the charity switch still applies)
--   playdate         a one-off social playdate
--   monthly_playdate a playdate repeating on the last Sunday of each month
-- Additive and backward compatible: every existing event stays 'standard'.
-- series_id ties the events made together for one monthly playdate.
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'standard';
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check CHECK (event_type IN ('standard', 'playdate', 'monthly_playdate'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_id uuid;
CREATE INDEX IF NOT EXISTS events_series_id ON events (series_id) WHERE series_id IS NOT NULL;
