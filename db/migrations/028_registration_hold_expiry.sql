ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz;

COMMENT ON COLUMN registrations.hold_expires_at IS
  'Ten-minute payment window for a waiting paid RSVP; review and paid records stay active.';
