-- Event-specific RSVP wording and an optional private vaccination-record photo.
-- Both event settings default to the current behaviour, so already-published
-- events and deployments that do not yet read them remain unchanged.
ALTER TABLE events
  ADD COLUMN rsvp_label text,
  ADD COLUMN vaccination_record_required boolean NOT NULL DEFAULT false;

-- Vaccination images are personal records. Keep them separate from public
-- event media and payment receipts, with one optional current image per RSVP.
CREATE TABLE registration_vaccination_records (
  registration_id uuid PRIMARY KEY REFERENCES registrations(id) ON DELETE CASCADE,
  mime text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data bytea NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
