-- Photographers (owner, 2026-11-04): a record per photographer (photo, short bio,
-- portfolio and social links) credited on the past events they covered ("Photos by").
-- show_on_site keeps a record off the website until it's ready. Additive only.
CREATE TABLE IF NOT EXISTS photographers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  photo        text,
  bio          text NOT NULL DEFAULT '' CHECK (length(bio) <= 300),
  website      text,
  instagram    text,
  facebook     text,
  tiktok       text,
  x_profile    text,
  threads      text,
  show_on_site boolean NOT NULL DEFAULT false,
  notes        text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TABLE IF NOT EXISTS event_photographers (
  event_id        uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES photographers (id) ON DELETE CASCADE,
  position        int NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, photographer_id)
);
