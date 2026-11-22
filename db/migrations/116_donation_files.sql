-- Donation tracker (owner, 22 Nov 2026). Each donor on an event's donor list can have their returned Cash
-- Donation Form (the signed PDF, or a photo of it) and their proof of payment (bank / GCash / BDO Pay
-- screenshots, or a PDF) attached. Private: served only to signed-in admins by /donations/file/<id>.
-- Files go with the donor row when they're taken off the event. A donation is "checked" once an admin
-- found the payment in HoR's account history (verified_at / verified_by). Additive.
CREATE TABLE IF NOT EXISTS donation_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL,
  contact_id  uuid NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('form', 'proof')),
  mime        text NOT NULL CHECK (mime IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  name        text CHECK (length(name) <= 160),
  size        integer NOT NULL CHECK (size > 0 AND size <= 3145728),
  data        bytea NOT NULL,
  uploaded_by text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (event_id, contact_id) REFERENCES event_donors (event_id, contact_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS donation_files_donor ON donation_files (event_id, contact_id, kind);

ALTER TABLE event_donors ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE event_donors ADD COLUMN IF NOT EXISTS verified_by text;
