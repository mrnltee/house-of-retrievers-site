-- Optional extra-furbaby pricing for human-based event tickets.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_pricing_basis_check;
ALTER TABLE events ADD CONSTRAINT events_pricing_basis_check
  CHECK (pricing_basis IN ('registration', 'human', 'furbaby', 'bundle', 'human_plus_furbaby'));

ALTER TABLE events
  ADD COLUMN included_furbabies_per_human integer NOT NULL DEFAULT 0
    CHECK (included_furbabies_per_human >= 0 AND included_furbabies_per_human <= 100),
  ADD COLUMN additional_furbaby_fee integer NOT NULL DEFAULT 0
    CHECK (additional_furbaby_fee >= 0 AND additional_furbaby_fee <= 1000000);
