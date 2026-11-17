-- Guest tracker → RSVP list (owner, 2026-11-17): a guest marked Coming is on the event's registrations as a
-- complimentary Guest or VIP. event_guests remembers which registration is theirs, and whether the tracker
-- made it (only one it made is cancelled again when the reply changes). Additive; safe to run again.
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES registrations(id) ON DELETE SET NULL;
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS registration_made boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS event_guests_registration ON event_guests (registration_id) WHERE registration_id IS NOT NULL;
