-- Who checked someone in, and how: the door scanner or entered by hand later
-- (with the arrival time from the paper list). Additive; existing check-ins
-- keep NULL for both.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS checked_in_by text,
  ADD COLUMN IF NOT EXISTS checked_in_source text CHECK (checked_in_source IN ('scan', 'manual'));

COMMENT ON COLUMN registrations.checked_in_source IS
  'scan (door QR or typed code) or manual (entered afterwards in the registrations list); NULL for check-ins before migration 036.';
