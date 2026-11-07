-- The event box in event emails (title, date, venue) becomes editable wording.
-- NULL = the standard box, '' = no box. Additive only.
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS details text CHECK (details IS NULL OR length(details) <= 600);
ALTER TABLE custom_email_templates ADD COLUMN IF NOT EXISTS details text CHECK (details IS NULL OR length(details) <= 600);
