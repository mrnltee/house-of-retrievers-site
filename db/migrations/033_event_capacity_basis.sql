-- Capacity is a separate, explicit choice from pricing. Existing events keep
-- the old one-registration-per-slot behavior through the default.
ALTER TABLE events
  ADD COLUMN capacity_basis text NOT NULL DEFAULT 'registration'
  CHECK (capacity_basis IN ('registration', 'human', 'furbaby'));

COMMENT ON COLUMN events.capacity_basis IS
  'Venue capacity units: one registration, one hooman, or one furbaby.';
