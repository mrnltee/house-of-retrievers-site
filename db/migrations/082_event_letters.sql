-- Event letters (owner, 2026-11-01): a letter can belong to one event (made from
-- an existing letter or blank on the event's Letters page); its [Event …] blanks
-- fill in from that event. Additive.
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS based_on text;
CREATE INDEX IF NOT EXISTS letter_templates_event ON letter_templates (event_id) WHERE event_id IS NOT NULL;
