-- Seasonal public branding: recurring Manila date windows and approved visual presets.
CREATE TABLE seasonal_themes (
  id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
  label          text NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  starts_month   smallint NOT NULL CHECK (starts_month BETWEEN 1 AND 12),
  starts_day     smallint NOT NULL CHECK (starts_day BETWEEN 1 AND 31),
  ends_month     smallint NOT NULL CHECK (ends_month BETWEEN 1 AND 12),
  ends_day       smallint NOT NULL CHECK (ends_day BETWEEN 1 AND 31),
  logo_variant   text NOT NULL CHECK (logo_variant IN ('default', 'halloween', 'holiday', 'sparkling', 'new-year', 'valentines')),
  splash_variant text NOT NULL CHECK (splash_variant IN ('default', 'halloween', 'holiday', 'sparkling', 'new-year', 'valentines')),
  welcome_text   text CHECK (length(welcome_text) <= 120),
  enabled        boolean NOT NULL DEFAULT true,
  priority       smallint NOT NULL DEFAULT 0,
  updated_by     text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO seasonal_themes (id, label, starts_month, starts_day, ends_month, ends_day, logo_variant, splash_variant, welcome_text, priority)
VALUES
  ('halloween', 'Halloween', 10, 1, 11, 2, 'halloween', 'halloween', 'A little spooky, always good-hearted.', 10),
  ('holiday', 'Christmas', 11, 3, 12, 25, 'holiday', 'holiday', 'Warm wishes from the House.', 10),
  ('sparkling', 'Sparkling', 11, 30, 11, 30, 'sparkling', 'sparkling', 'A little extra sparkle for good things ahead.', 20),
  ('new-year', 'New Year', 12, 26, 1, 8, 'new-year', 'new-year', 'Welcome 2028.', 20),
  ('valentines', 'Valentine''s', 2, 1, 2, 15, 'valentines', 'valentines', 'More love. More good we can do together.', 10)
ON CONFLICT (id) DO NOTHING;
