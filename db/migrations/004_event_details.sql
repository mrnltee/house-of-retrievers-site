-- Charity flag (the beneficiary shows only for charity events), purpose,
-- hashtags, and where the venue is on a map.
ALTER TABLE events ADD COLUMN is_charity boolean NOT NULL DEFAULT false;
UPDATE events SET is_charity = true WHERE supports IS NOT NULL AND supports <> '';
ALTER TABLE events ADD COLUMN purpose text
  CHECK (purpose IN ('Purpose to Give Back', 'Purpose to Care', 'Purpose to Connect', 'Purpose to Learn', 'Purpose to Celebrate'));
ALTER TABLE events ADD COLUMN hashtags text[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN venue_lat double precision CHECK (venue_lat BETWEEN -90 AND 90);
ALTER TABLE events ADD COLUMN venue_lng double precision CHECK (venue_lng BETWEEN -180 AND 180);
ALTER TABLE events ADD COLUMN map_url text;
