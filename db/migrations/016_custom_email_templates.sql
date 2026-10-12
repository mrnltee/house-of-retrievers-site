-- More built-in emails HOR can reword (volunteer, partner and sponsor Join
-- replies, the standard RSVP confirmation), and templates HOR writes itself:
-- "acceptance" (sent from a person's profile, or picked when making a member
-- Active) and "event" (picked per event, sent to everyone who RSVPs).
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_key_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_key_check
  CHECK (key IN ('member-registered', 'received-volunteer', 'received-partner', 'received-sponsor', 'member-welcome', 'volunteer-welcome', 'rsvp-confirmed'));

CREATE TABLE custom_email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  kind        text NOT NULL CHECK (kind IN ('acceptance', 'event')),
  subject     text NOT NULL CHECK (length(subject) <= 150),
  greeting    text NOT NULL DEFAULT '' CHECK (length(greeting) <= 120),
  heading     text NOT NULL CHECK (length(heading) <= 150),
  message     text NOT NULL CHECK (length(message) <= 4000),
  created_by  text NOT NULL,
  updated_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN email_template_id uuid REFERENCES custom_email_templates (id) ON DELETE SET NULL;
