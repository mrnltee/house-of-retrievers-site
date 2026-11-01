-- Letter delivery log (owner, 2026-11-01): one row per letter email, with
-- Resend's id so the Guest list and Beneficiaries can show whether it was
-- delivered, bounced or failed, and when. Additive only.
CREATE TABLE IF NOT EXISTS letter_sends (
  id           bigserial PRIMARY KEY,
  ref          text NOT NULL,              -- contact:<id>, supporter:<id>, beneficiary:<id>, person:<id>
  letter_key   text NOT NULL,
  email_to     text NOT NULL,
  cc           text[] NOT NULL DEFAULT '{}',
  provider_id  text,                       -- Resend email id
  status       text NOT NULL DEFAULT 'sent',
  detail       text CHECK (length(detail) <= 300),
  sent_by      text,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  status_at    timestamptz NOT NULL DEFAULT now(),
  checked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS letter_sends_ref ON letter_sends (ref, sent_at DESC);
