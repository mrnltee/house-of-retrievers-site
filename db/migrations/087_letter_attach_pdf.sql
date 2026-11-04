-- A letter can be email-only (owner, 2026-11-04): attach_pdf off means no letter text,
-- no PDF, and the covering email is the whole message. Existing letters keep their PDF.
-- The covering email may now be longer (it can be the whole invitation): the length
-- check is relaxed from 2,000 to 8,000 characters. No data changes.
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS attach_pdf boolean NOT NULL DEFAULT true;
ALTER TABLE letter_templates DROP CONSTRAINT IF EXISTS letter_templates_cover_check;
ALTER TABLE letter_templates ADD CONSTRAINT letter_templates_cover_check CHECK (length(cover) <= 8000);
