-- Vaccine records by type (owner, 22 Nov 2026). Additive only.
-- Each vaccination photo can say which vaccine it shows (5in1, rabies,
-- kennel-cough, or other); NULL = a photo sent before types (the whole card).
ALTER TABLE registration_vaccination_records ADD COLUMN IF NOT EXISTS vaccine text
  CHECK (vaccine IS NULL OR vaccine IN ('5in1', 'rabies', 'kennel-cough', 'other'));

-- An admin's "checked against the card" for one vaccine of one furbaby.
CREATE TABLE IF NOT EXISTS registration_vaccine_checks (
  registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  furbaby_index   integer NOT NULL CHECK (furbaby_index BETWEEN 0 AND 9),
  vaccine         text NOT NULL CHECK (vaccine IN ('5in1', 'rabies', 'kennel-cough')),
  verified_at     timestamptz NOT NULL DEFAULT now(),
  verified_by     text,
  PRIMARY KEY (registration_id, furbaby_index, vaccine)
);
