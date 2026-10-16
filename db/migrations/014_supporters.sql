-- Sponsors and partners: one record per organization (Figma "Sponsors &
-- partners (12 Oct 2026)", S1/S2). Public on the home page only when
-- confirmed, switched on, and given a logo and a blurb. Amounts are public
-- (HOR's transparency promise) once the sponsor has been told: amounts_agreed_at.
CREATE TABLE supporters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              text NOT NULL CHECK (kind IN ('Sponsor', 'Partner')),
  name              text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  slug              text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,90}$'),
  status            text NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'talking', 'confirmed', 'ended')),
  tier              text CHECK (tier IN ('pack-leader', 'best-friend', 'good-pup')),
  logo              text,
  website           text,
  instagram         text,
  blurb             text CHECK (length(blurb) <= 200),
  gives             text[] NOT NULL DEFAULT '{}',
  support_year      smallint,
  cash_amount       integer CHECK (cash_amount >= 0),
  in_kind_value     integer CHECK (in_kind_value >= 0),
  in_kind_note      text CHECK (length(in_kind_note) <= 160),
  show_on_site      boolean NOT NULL DEFAULT false,
  amounts_agreed_at date,
  amounts_agreed_by text,
  contact_name      text,
  contact_email     text,
  contact_phone     text,
  notes             text CHECK (length(notes) <= 2000),
  person_id         uuid REFERENCES people (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX supporters_one_per_name ON supporters (lower(name));
