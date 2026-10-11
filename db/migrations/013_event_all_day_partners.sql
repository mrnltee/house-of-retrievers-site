-- All-day events (no start or end time), and the partners and sponsors an
-- event is run with, by name. Both optional.
ALTER TABLE events ADD COLUMN all_day boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN partners text[] NOT NULL DEFAULT '{}' CHECK (cardinality(partners) <= 8);
ALTER TABLE events ADD COLUMN sponsors text[] NOT NULL DEFAULT '{}' CHECK (cardinality(sponsors) <= 8);
