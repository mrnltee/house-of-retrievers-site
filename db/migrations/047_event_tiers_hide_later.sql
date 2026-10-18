-- "Show later prices only once they open": with prices offered in order, the
-- event page and card list only the tiers open now (and earlier ones as ended).
ALTER TABLE events ADD COLUMN IF NOT EXISTS tiers_hide_later boolean NOT NULL DEFAULT false;
