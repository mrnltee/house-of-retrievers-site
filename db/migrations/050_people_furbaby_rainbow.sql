-- Furbabies who crossed the rainbow bridge: one flag per furbaby, by position,
-- next to people.furbaby_name / furbaby_breeds. NULL when none did.
ALTER TABLE people ADD COLUMN IF NOT EXISTS furbaby_rainbow boolean[];
