-- The check-in welcome card's photo for one RSVP. Additive: with no row and a
-- NULL choice, a registration behaves as before (the photo comes from the
-- matching People record, else initials).
CREATE TABLE IF NOT EXISTS registration_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  mime            text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data            bytea NOT NULL,
  bytes           integer NOT NULL,
  uploaded_by     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_photos_registration ON registration_photos (registration_id, created_at DESC);

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS welcome_photo text CHECK (welcome_photo IN ('own', 'initials')),
  ADD COLUMN IF NOT EXISTS welcome_photo_id uuid REFERENCES registration_photos (id) ON DELETE SET NULL;

COMMENT ON COLUMN registrations.welcome_photo IS
  'The team''s choice for the check-in welcome photo: NULL automatic (People match), own (welcome_photo_id), or initials.';
COMMENT ON COLUMN registrations.welcome_photo_id IS
  'The RSVP''s own welcome photo in registration_photos, used when welcome_photo = own.';
