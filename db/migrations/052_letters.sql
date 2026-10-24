-- Letters (Settings → Letters): HOR's prepared letters, sent as a PDF with a
-- covering email from Sponsors & partners or People. The starting wording lives
-- in code (app/lib/letters/starters.mjs); a row here is HOR's saved wording
-- for that letter and replaces it. Additive: new tables only.
CREATE TABLE IF NOT EXISTS letter_templates (
  key        text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]{1,60}$'),
  name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  subject    text NOT NULL CHECK (length(subject) <= 150),
  cover      text NOT NULL CHECK (length(cover) <= 2000),
  body       text NOT NULL CHECK (length(body) <= 40000),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- What was last typed for a letter's blanks (contact person, signatory, bank
-- details…), offered again next time. Keyed by the blank's label.
CREATE TABLE IF NOT EXISTS letter_saved_values (
  label      text PRIMARY KEY CHECK (length(label) BETWEEN 1 AND 400),
  value      text NOT NULL CHECK (length(value) <= 600),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
