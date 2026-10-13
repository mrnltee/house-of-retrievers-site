-- Shared family email addresses, plus a 30-day recovery window for accidental deletions.
ALTER TABLE registrations
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by text,
  ADD COLUMN deleted_previous_status text CHECK (deleted_previous_status IN ('confirmed', 'waitlist', 'cancelled')),
  ADD COLUMN duplicate_allowed boolean NOT NULL DEFAULT false;

-- Install the replacement guard before removing the email-only one. Old
-- production code still gets database protection while staging is deploying.
CREATE UNIQUE INDEX registrations_one_per_identity
  ON registrations (event_id, lower(email), lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')))
  WHERE deleted_at IS NULL AND status <> 'cancelled' AND NOT duplicate_allowed;
DROP INDEX registrations_one_per_email;
CREATE INDEX registrations_deleted_at ON registrations (deleted_at) WHERE deleted_at IS NOT NULL;
