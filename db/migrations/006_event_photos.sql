-- Album photos for events (past events first). The picture itself lives in
-- Cloudinary; this row keeps its id, size and description, who added it, and
-- whether it shows. Participant uploads arrive as 'pending' (a later step);
-- admin uploads are 'approved' straight away.
CREATE TABLE event_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  public_id    text NOT NULL UNIQUE,
  width        integer NOT NULL CHECK (width > 0),
  height       integer NOT NULL CHECK (height > 0),
  bytes        integer NOT NULL CHECK (bytes > 0),
  alt          text,
  credit       text,
  source       text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'participant')),
  status       text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  position     integer NOT NULL DEFAULT 0,
  uploaded_by  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_photos_event ON event_photos (event_id, status, position);
