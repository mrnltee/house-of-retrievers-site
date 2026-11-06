-- Several photos per furbaby's vaccination record (a card often has more than one page).
-- Existing rows become page 0. Additive: page_no is defaulted, and the key widens from
-- (registration, furbaby) to (registration, furbaby, page).
ALTER TABLE registration_vaccination_records ADD COLUMN IF NOT EXISTS page_no integer NOT NULL DEFAULT 0 CHECK (page_no BETWEEN 0 AND 4);
ALTER TABLE registration_vaccination_records DROP CONSTRAINT IF EXISTS registration_vaccination_records_pkey;
ALTER TABLE registration_vaccination_records ADD PRIMARY KEY (registration_id, furbaby_index, page_no);
