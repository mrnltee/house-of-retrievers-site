-- The furbaby breed given on the Join form (keys from app/lib/breeds.mjs).
-- Optional and additive: NULL for everyone who joined before.
ALTER TABLE people ADD COLUMN IF NOT EXISTS furbaby_breeds text[];

COMMENT ON COLUMN people.furbaby_breeds IS 'Breed keys of their furbaby from the Join form; NULL when not given.';
