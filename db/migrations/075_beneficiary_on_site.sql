-- Beneficiaries on the website (owner, 2026-11-01): admins choose which
-- partnered or past beneficiaries the home page shows, with a short public
-- line. Contact details and notes stay admin-only. Additive only.
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS show_on_site boolean NOT NULL DEFAULT false;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS blurb text CHECK (length(blurb) <= 280);
