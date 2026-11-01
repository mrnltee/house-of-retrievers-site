-- Guest list per event (owner, 2026-11-01): each event has its own guest list
-- (politicians, speakers, celebrities, VIPs, creators, media, donors…), opened
-- from the event; guests are people from letter_contacts, reusable across
-- events. Their reply is per event. Additive.
CREATE TABLE IF NOT EXISTS event_guests (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES letter_contacts(id),
  reply       text NOT NULL DEFAULT 'waiting' CHECK (reply IN ('waiting', 'yes', 'no')),
  notes       text CHECK (length(notes) <= 1000),
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, contact_id)
);
CREATE INDEX IF NOT EXISTS event_guests_contact ON event_guests (contact_id);
