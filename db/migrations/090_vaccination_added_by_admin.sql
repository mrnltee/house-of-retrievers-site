-- Who added a vaccination card by hand (an admin, for a registrant who sent it outside the form).
-- NULL = uploaded by the registrant on the RSVP form. Additive and nullable, so older code is unaffected.
ALTER TABLE registration_vaccination_records ADD COLUMN IF NOT EXISTS uploaded_by text;
