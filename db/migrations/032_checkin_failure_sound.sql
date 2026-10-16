ALTER TABLE events
  ADD COLUMN IF NOT EXISTS checkin_failure_sound_preset text NOT NULL DEFAULT 'warning';
