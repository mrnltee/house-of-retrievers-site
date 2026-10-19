-- "Send payment reminder" on an expired hold: when the last reminder went and how many.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS hold_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_reminders integer NOT NULL DEFAULT 0;
