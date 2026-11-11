-- Guest specification (owner, 2026-11-12): what a guest is, as on HOR's guest
-- sheet (Celebrity / Actress, Petfluencer, VIP…). Optional, a label only; the
-- category still picks the letter. Additive only.
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS specification text;
