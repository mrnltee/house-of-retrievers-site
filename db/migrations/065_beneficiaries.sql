-- Beneficiaries (owner, 2026-10-31): animal shelters and rescue groups HOR
-- supports or plans to, each with a description, contact and letter details,
-- like Sponsors & partners. Admin only for now. Additive only.
CREATE TABLE IF NOT EXISTS beneficiaries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind           text NOT NULL DEFAULT 'shelter',
  status         text NOT NULL DEFAULT 'prospect',
  description    text CHECK (length(description) <= 2000),
  needs          text CHECK (length(needs) <= 1000),
  location       text CHECK (length(location) <= 120),
  website        text CHECK (length(website) <= 300),
  instagram      text CHECK (length(instagram) <= 120),
  contact_name   text CHECK (length(contact_name) <= 120),
  contact_email  text CHECK (length(contact_email) <= 200),
  contact_phone  text CHECK (length(contact_phone) <= 60),
  address        text CHECK (length(address) <= 300),
  salutation     text CHECK (length(salutation) <= 120),
  notes          text CHECK (length(notes) <= 2000),
  last_letter    text,
  last_sent_at   timestamptz,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS beneficiaries_one_per_name ON beneficiaries (lower(name)) WHERE deleted_at IS NULL;
