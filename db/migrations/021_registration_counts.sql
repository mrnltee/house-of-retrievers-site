-- Registration attendance counts and event pricing basis. Existing rows keep
-- the old one-ticket-per-registration behavior and a one-person/zero-furbaby
-- attendance snapshot.
ALTER TABLE events
  ADD COLUMN pricing_basis text NOT NULL DEFAULT 'registration'
    CHECK (pricing_basis IN ('registration', 'human', 'furbaby', 'bundle'));

ALTER TABLE registrations
  ADD COLUMN human_count integer NOT NULL DEFAULT 1 CHECK (human_count >= 1 AND human_count <= 100),
  ADD COLUMN furbaby_count integer NOT NULL DEFAULT 0 CHECK (furbaby_count >= 0 AND furbaby_count <= 100),
  ADD COLUMN amount_due integer CHECK (amount_due >= 0);

UPDATE registrations SET amount_due = ticket_amount WHERE amount_due IS NULL;
