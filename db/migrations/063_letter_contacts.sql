-- Guest list (owner, 2026-10-31): celebrities, influencers, politicians, VIPs,
-- media, speakers, sponsor and partner prospects HOR sends letters to. Each
-- category matches one letter (app/lib/contacts.mjs). Additive only.
CREATE TABLE IF NOT EXISTS letter_contacts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text NOT NULL,
  name           text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  organization   text CHECK (length(organization) <= 120),
  email          text CHECK (length(email) <= 200),
  phone          text CHECK (length(phone) <= 60),
  handle         text CHECK (length(handle) <= 120),
  notes          text CHECK (length(notes) <= 1000),
  last_letter    text,
  last_sent_at   timestamptz,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE INDEX IF NOT EXISTS letter_contacts_category ON letter_contacts (category) WHERE deleted_at IS NULL;
