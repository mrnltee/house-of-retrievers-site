-- When an admin changes an event's web address (slug), the old one is kept
-- here so links already shared still reach the event: the public event page
-- forwards an old slug to the event's current one. Rows go with the event.
CREATE TABLE event_slug_redirects (
  old_slug    text PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_slug_redirects_event ON event_slug_redirects (event_id);
