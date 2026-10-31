-- Letter setup (owner, 2026-10-31). Additive only.
-- 1. HOR's own letters: rows in letter_templates with no built-in starter; removable.
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- 2. Standard details: a saved answer marked standard fills in by itself and isn't asked when sending.
ALTER TABLE letter_saved_values ADD COLUMN IF NOT EXISTS standard boolean NOT NULL DEFAULT false;
-- 3. Which letter each Guest list category (and Beneficiaries) gets; missing rows use the defaults in app/lib/contacts.mjs.
CREATE TABLE IF NOT EXISTS letter_group_letters (
  group_key  text PRIMARY KEY CHECK (group_key ~ '^[a-z-]{1,40}$'),
  letter_key text NOT NULL CHECK (letter_key ~ '^[a-z0-9-]{1,60}$'),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
