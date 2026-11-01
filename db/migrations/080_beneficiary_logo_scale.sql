-- Beneficiary logo size (owner, 2026-11-01): logos fit inside their circle on the
-- website; admins can make one bigger (to fill the circle) or smaller. Percent.
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS logo_scale smallint NOT NULL DEFAULT 100 CHECK (logo_scale BETWEEN 50 AND 200);
