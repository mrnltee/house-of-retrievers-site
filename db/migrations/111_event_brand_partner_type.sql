-- Partner classification per event (owner, 2026-11-18): a partner on an event's Brand tracker can be a
-- co-presenter, an in-kind partner or an exhibitor. NULL = a partner with no classification (and every sponsor).
-- Additive only.
ALTER TABLE event_brands ADD COLUMN IF NOT EXISTS partner_type text;
DO $$ BEGIN
  ALTER TABLE event_brands ADD CONSTRAINT event_brands_partner_type_check
    CHECK (partner_type IS NULL OR partner_type IN ('co-presenter', 'in-kind', 'exhibitor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
