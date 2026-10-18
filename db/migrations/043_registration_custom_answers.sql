-- Answers to an event's own Yes / No RSVP questions (rsvp_form_config.questions):
-- { "<question id>": true | false }. NULL when the event asked none.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS custom_answers jsonb;
