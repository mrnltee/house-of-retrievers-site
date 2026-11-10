-- Furbaby age in years (owner, 10 Nov 2026), one per furbaby by position,
-- "" where not given; NULL when none was given. Additive only.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS furbaby_ages text[];
ALTER TABLE people ADD COLUMN IF NOT EXISTS furbaby_ages text[];
-- When a People record's ages were given, so they can grow with time.
ALTER TABLE people ADD COLUMN IF NOT EXISTS furbaby_ages_on date;
COMMENT ON COLUMN registrations.furbaby_ages IS 'Age in years per furbaby, as given on the RSVP (text, "" where not given).';
COMMENT ON COLUMN people.furbaby_ages IS 'Age in years per furbaby, as given on furbaby_ages_on.';
