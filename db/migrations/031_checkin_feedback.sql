ALTER TABLE events
  ADD COLUMN IF NOT EXISTS checkin_success_title text,
  ADD COLUMN IF NOT EXISTS checkin_success_message text,
  ADD COLUMN IF NOT EXISTS checkin_sound_preset text NOT NULL DEFAULT 'dazzle',
  ADD COLUMN IF NOT EXISTS checkin_sound_mime text,
  ADD COLUMN IF NOT EXISTS checkin_sound_data bytea,
  ADD COLUMN IF NOT EXISTS checkin_sound_bytes integer;
