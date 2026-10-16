ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS consent_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_name text,
  ADD COLUMN IF NOT EXISTS consent_version text;
