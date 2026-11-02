-- Donor list per event (owner, 2026-11-02): who HOR asked for a cash donation for
-- this event (by email letter or IG/FB DM), what they pledged or gave, and what
-- their official receipt and public thanks need. Donors are people from
-- letter_contacts, reusable across events. Admin-only; nothing public. Additive.
CREATE TABLE IF NOT EXISTS event_donors (
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id       uuid NOT NULL REFERENCES letter_contacts(id),
  status           text NOT NULL DEFAULT 'asked' CHECK (status IN ('asked', 'pledged', 'received', 'receipt_sent', 'declined')),
  asked_via        text NOT NULL DEFAULT 'email' CHECK (asked_via IN ('email', 'instagram', 'facebook', 'in_person', 'other')),
  amount           integer CHECK (amount >= 0),
  method           text CHECK (method IN ('bank', 'gcash', 'cheque', 'cash')),
  received_on      date,
  reference        text CHECK (length(reference) <= 120),
  receipt_name     text CHECK (length(receipt_name) <= 160),
  receipt_address  text CHECK (length(receipt_address) <= 300),
  acknowledge      text NOT NULL DEFAULT 'private' CHECK (acknowledge IN ('private', 'public')),
  public_name      text CHECK (length(public_name) <= 160),
  notes            text CHECK (length(notes) <= 1000),
  added_by         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, contact_id)
);
CREATE INDEX IF NOT EXISTS event_donors_contact ON event_donors (contact_id);
