-- Photo and logo for Guest list contacts and beneficiaries (owner, 2026-10-31).
-- Stored in event_images like sponsor logos; these hold "/api/event-image/<id>". Additive only.
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS photo text CHECK (length(photo) <= 300);
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS logo text CHECK (length(logo) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS photo text CHECK (length(photo) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS logo text CHECK (length(logo) <= 300);
