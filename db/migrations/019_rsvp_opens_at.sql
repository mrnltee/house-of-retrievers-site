-- Scheduled RSVP opening (12 Oct 2026): when set and still ahead, the events
-- pages show a countdown instead of the RSVP button and /api/rsvp turns
-- sign-ups away. NULL = open as soon as RSVPs are switched on (as before).
ALTER TABLE events ADD COLUMN rsvp_opens_at timestamptz;
