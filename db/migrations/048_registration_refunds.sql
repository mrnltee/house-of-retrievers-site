-- A refund on a paid registration (e.g. overpaid before pair pricing): how much
-- went back, how, the reference, when and by whom. The original payment record
-- (pay_amount, fee_reference, receipt) is kept unchanged.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS refund_amount numeric CHECK (refund_amount > 0),
  ADD COLUMN IF NOT EXISTS refund_method text,
  ADD COLUMN IF NOT EXISTS refund_reference text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by text;
