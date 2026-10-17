-- The breed of each furbaby on an RSVP, in order (keys from app/lib/breeds.mjs).
-- Optional and additive: NULL for every existing registration.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS furbaby_breeds text[];

COMMENT ON COLUMN registrations.furbaby_breeds IS 'One breed key per furbaby, in order; "" where not chosen. NULL when none was picked.';
