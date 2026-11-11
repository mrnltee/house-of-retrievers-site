-- Check-in display screen background (owner, 2026-11-12): black & gold
-- (default), ivory, the event's poster, or HOR's own image (a private
-- event_images picture). Additive only.
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_display_bg text NOT NULL DEFAULT 'dark';
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_display_image text;
