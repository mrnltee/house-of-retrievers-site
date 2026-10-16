ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rsvp_form_config jsonb NOT NULL DEFAULT '{}'::jsonb;
