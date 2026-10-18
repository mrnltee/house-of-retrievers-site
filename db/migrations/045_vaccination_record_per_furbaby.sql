-- One optional vaccination-record photo per furbaby, not per registration.
-- Existing rows become furbaby 1 (index 0); older code that inserts without an
-- index still writes index 0.
ALTER TABLE registration_vaccination_records ADD COLUMN IF NOT EXISTS furbaby_index integer NOT NULL DEFAULT 0 CHECK (furbaby_index BETWEEN 0 AND 9);
ALTER TABLE registration_vaccination_records DROP CONSTRAINT IF EXISTS registration_vaccination_records_pkey;
ALTER TABLE registration_vaccination_records ADD PRIMARY KEY (registration_id, furbaby_index);
