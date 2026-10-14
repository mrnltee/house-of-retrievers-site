-- Sponsor and partner identity update (14 Oct 2026):
-- new records use HOR-XXXX-YY-NNNN and may carry a short user-set label.
-- Keep legacy 3-letter codes valid until an admin deliberately upgrades them.
ALTER TABLE supporters DROP CONSTRAINT IF EXISTS supporters_code_check;
ALTER TABLE supporters ADD CONSTRAINT supporters_code_check CHECK (code ~ '^[A-Z]{3,4}$');

ALTER TABLE supporters
  ADD COLUMN category_label text CHECK (category_label IS NULL OR length(category_label) BETWEEN 1 AND 60);
