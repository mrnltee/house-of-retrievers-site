-- The venue's street address on its own line (the venue field keeps the name
-- people know), and what a ticket or pass includes, as a short list.
ALTER TABLE events ADD COLUMN venue_address text;
ALTER TABLE events ADD COLUMN included text[] NOT NULL DEFAULT '{}' CHECK (cardinality(included) <= 10);
