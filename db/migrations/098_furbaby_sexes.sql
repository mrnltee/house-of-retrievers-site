-- Furbaby gender (owner, 2026-11-10): one value per furbaby, by position, next to
-- furbaby_name / furbaby_breeds: 'male', 'female', or '' where not said. NULL when
-- none was chosen, so every existing record keeps showing as before. Additive only.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS furbaby_sexes text[];
ALTER TABLE people ADD COLUMN IF NOT EXISTS furbaby_sexes text[];
COMMENT ON COLUMN registrations.furbaby_sexes IS 'One of male/female per furbaby, in order; "" where not said. NULL when none was chosen.';
COMMENT ON COLUMN people.furbaby_sexes IS 'One of male/female per furbaby, in order; "" where not said. NULL when none was chosen.';
