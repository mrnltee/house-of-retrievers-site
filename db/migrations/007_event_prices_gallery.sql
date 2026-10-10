-- Price tiers, up to three more photos beside the cover, and who may add
-- photos to the album once the member portal exists. Additive only: code
-- that predates these columns keeps working (previews share this database).

-- [{"label": "Early bird", "amount": 500}, …]; amount in pesos, 0 = free.
-- Empty means "use cost" (events saved before tiers existed).
ALTER TABLE events ADD COLUMN price_tiers jsonb NOT NULL DEFAULT '[]'
  CHECK (jsonb_typeof(price_tiers) = 'array' AND jsonb_array_length(price_tiers) <= 6);

-- [{"src": "/api/event-image/<id>", "alt": "…"}, …], shown whole on the event page after the cover.
ALTER TABLE events ADD COLUMN gallery jsonb NOT NULL DEFAULT '[]'
  CHECK (jsonb_typeof(gallery) = 'array' AND jsonb_array_length(gallery) <= 3);

-- Who may add photos to this event's album through the member portal (not built yet).
ALTER TABLE events ADD COLUMN photo_uploads text[] NOT NULL DEFAULT '{}'
  CHECK (photo_uploads <@ ARRAY['attendees', 'members', 'volunteers', 'partners', 'sponsors']::text[]);
