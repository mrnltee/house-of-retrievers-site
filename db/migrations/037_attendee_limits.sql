-- Per-event attendee caps for the public RSVP. NULL (the default for every
-- existing event) means no limit, so nothing changes until an event sets them.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS max_furbabies_per_registration integer CHECK (max_furbabies_per_registration BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS max_humans_per_furbaby integer CHECK (max_humans_per_furbaby BETWEEN 1 AND 20);

COMMENT ON COLUMN events.max_furbabies_per_registration IS 'Most furbabies one public RSVP may list; NULL = no limit.';
COMMENT ON COLUMN events.max_humans_per_furbaby IS 'Most people per furbaby on one public RSVP (humans <= this x furbabies); NULL = no limit.';
