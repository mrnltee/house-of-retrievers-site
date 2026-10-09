-- Event cover photos uploaded in the admin. Kept in Postgres rather than
-- Vercel Blob (whose free tier also holds the Instagram token) or a new
-- service. Each photo is resized in the browser first (about 200–400 KB),
-- and the public route sends it with a one-year cache, so the CDN serves
-- repeat views and the database is read about once per photo.
CREATE TABLE event_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mime        text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data        bytea NOT NULL,
  bytes       integer NOT NULL,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
