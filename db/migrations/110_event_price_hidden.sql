-- Keep an event's price private until its RSVPs open (owner, 18 Nov 2026).
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_hidden_until_open boolean NOT NULL DEFAULT false;
