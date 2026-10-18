-- HOR's own breed icons, uploaded in the admin. A row replaces the built-in
-- public/breeds/<key>.svg; deleting it goes back to the built-in one.
CREATE TABLE IF NOT EXISTS breed_icons (
  key        text PRIMARY KEY,
  mime       text NOT NULL CHECK (mime IN ('image/svg+xml', 'image/png', 'image/webp')),
  data       bytea NOT NULL,
  bytes      integer NOT NULL,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
