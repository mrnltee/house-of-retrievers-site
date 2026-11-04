-- HOR-wide email settings (owner, 2026-11-04): the sign-off and footer every email
-- ends with, editable in Email templates. One row per setting. Additive only.
CREATE TABLE IF NOT EXISTS email_settings (
  key        text PRIMARY KEY CHECK (key IN ('signoff', 'footer')),
  value      text NOT NULL CHECK (length(value) <= 600),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
