-- "Offer prices in order": the RSVP shows only the first ticket still on sale
-- (e.g. Early Bird), and the next appears once it sells out or ends. Off by
-- default, so existing events keep their ticket picker.
ALTER TABLE events ADD COLUMN IF NOT EXISTS tiers_in_order boolean NOT NULL DEFAULT false;
