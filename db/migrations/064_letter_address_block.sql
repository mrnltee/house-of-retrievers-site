-- Letter address block (owner, 2026-10-31): letters open with
--   [Contact Person?] / [Company Name] / [Address?] and greet "Dear [Salutation]".
-- These fill from the listing. Additive only.
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS address text CHECK (length(address) <= 300);
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS salutation text CHECK (length(salutation) <= 120);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS address text CHECK (length(address) <= 300);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS salutation text CHECK (length(salutation) <= 120);
