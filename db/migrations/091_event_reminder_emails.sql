-- Event reminder / guidelines email: HOR can reword it (Email templates), and each
-- registration remembers when it was last reminded. Additive: widens the allowed
-- template keys and adds two columns with defaults.
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_key_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_key_check
  CHECK (key IN ('member-registered', 'received-volunteer', 'received-partner', 'received-sponsor', 'member-welcome', 'volunteer-welcome', 'rsvp-confirmed', 'event-reminder'));
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
