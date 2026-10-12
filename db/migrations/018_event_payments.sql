-- Event payments (12 Oct 2026, Figma "Event payments" on the Admin module page).
-- RSVP with a ticket → spot held ("waiting") → the registrant uploads their
-- reference number and confirmation screenshot ("review") → an admin with fee
-- access approves ("paid", QR pass emailed) or asks for a new receipt
-- ("rejected", reason emailed). No time limit on holds. Non-refundable.
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_fee_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_fee_status_check
  CHECK (fee_status IN ('not_due', 'waiting', 'review', 'rejected', 'paid'));

ALTER TABLE registrations
  ADD COLUMN ticket_label   text CHECK (length(ticket_label) <= 60),
  ADD COLUMN ticket_amount  integer CHECK (ticket_amount >= 0),
  ADD COLUMN pay_method     text CHECK (pay_method IN ('gcash', 'maya', 'gotyme', 'qrph', 'bank', 'cash', 'other')),
  ADD COLUMN pay_amount     integer CHECK (pay_amount >= 0),
  ADD COLUMN proof_at       timestamptz,
  ADD COLUMN fee_checked_by text,
  ADD COLUMN fee_checked_at timestamptz,
  ADD COLUMN fee_note       text CHECK (length(fee_note) <= 400),
  ADD COLUMN pass_sent_at   timestamptz,
  ADD COLUMN added_by       text;

-- Their confirmation screenshot, private (served only to admins). The newest
-- row per registration is the current one; older ones stay as history.
CREATE TABLE payment_proofs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  mime             text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data             bytea NOT NULL,
  bytes            integer NOT NULL,
  uploaded_by      text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_proofs_registration ON payment_proofs (registration_id, created_at DESC);
CREATE INDEX registrations_fee_reference ON registrations (event_id, lower(fee_reference)) WHERE fee_reference IS NOT NULL;

-- GoTyme joins the payment channels (Payment settings; same approval rules).
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_key_check;
ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_key_check CHECK (key IN ('gcash', 'maya', 'gotyme', 'qrph', 'bank'));
INSERT INTO payment_methods (key) VALUES ('gotyme') ON CONFLICT (key) DO NOTHING;
