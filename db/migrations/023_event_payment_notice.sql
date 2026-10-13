-- Event-specific payment wording and optional on-site payment.
ALTER TABLE events
  ADD COLUMN onsite_payment boolean NOT NULL DEFAULT false;
