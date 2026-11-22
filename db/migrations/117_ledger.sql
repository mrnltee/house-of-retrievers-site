-- Ledger and transparency report (owner, 22 Nov 2026). Kept by Treasurers and Owners (ledger:edit); Events
-- leads can read it. Fees, donations and brand cash / in-kind come from their own tables; these are the lines
-- the treasurer types: expenses (a receipt is required), other cash income, in-kind items from people, and
-- turnovers to beneficiaries (proof of handover required). event_id NULL = not tied to an event (general).
-- Amounts are whole pesos; an in-kind item may have no value yet. Removing a line hides it (deleted_at) so
-- the activity log and old reports still make sense. Additive.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid REFERENCES events(id) ON DELETE SET NULL,
  kind           text NOT NULL CHECK (kind IN ('expense', 'income', 'in_kind', 'turnover')),
  entry_date     date NOT NULL,
  category       text NOT NULL CHECK (length(category) BETWEEN 1 AND 40),
  description    text NOT NULL CHECK (length(description) BETWEEN 1 AND 300),
  party          text CHECK (length(party) <= 160),
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE SET NULL,
  amount         integer CHECK (amount >= 0),
  quantity       text CHECK (length(quantity) <= 60),
  method         text CHECK (method IN ('bank', 'gcash', 'cheque', 'cash', 'card', 'other')),
  reference      text CHECK (length(reference) <= 120),
  show_name      boolean NOT NULL DEFAULT true,
  notes          text CHECK (length(notes) <= 1000),
  created_by     text,
  updated_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CHECK (kind = 'in_kind' OR amount IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ledger_entries_event ON ledger_entries (event_id, entry_date) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ledger_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
  mime        text NOT NULL CHECK (mime IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  name        text CHECK (length(name) <= 160),
  size        integer NOT NULL CHECK (size > 0 AND size <= 3145728),
  data        bytea NOT NULL,
  uploaded_by text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_files_entry ON ledger_files (entry_id);
