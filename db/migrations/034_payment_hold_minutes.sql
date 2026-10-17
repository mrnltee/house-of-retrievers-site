-- A paid RSVP's "waiting" hold length, configurable per event. NULL inherits
-- the platform default (24 hours); 0 means no limit (the hold never
-- expires, matching how a null hold_expires_at already behaves).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_hold_minutes integer
  CHECK (payment_hold_minutes IN (0, 10, 60, 1440, 2880));

COMMENT ON COLUMN events.payment_hold_minutes IS
  'Minutes a paid RSVP''s waiting hold lasts before its slot frees up. NULL inherits the 24-hour default; 0 is no limit.';
