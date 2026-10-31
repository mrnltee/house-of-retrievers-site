-- Guest list representatives and beneficiary address parts (owner, 2026-10-31). Additive only.
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS rep_name text CHECK (length(rep_name) <= 120);
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS rep_email text CHECK (length(rep_email) <= 200);
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS rep_phone text CHECK (length(rep_phone) <= 60);
-- Who letters are emailed to: the person, their representative, or both (person To, representative CC).
ALTER TABLE letter_contacts ADD COLUMN IF NOT EXISTS send_to text NOT NULL DEFAULT 'person' CHECK (send_to IN ('person', 'representative', 'both'));
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS street text CHECK (length(street) <= 200);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS barangay text CHECK (length(barangay) <= 80);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS city text CHECK (length(city) <= 80);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS province text CHECK (length(province) <= 80);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS postal_code text CHECK (length(postal_code) <= 10);
