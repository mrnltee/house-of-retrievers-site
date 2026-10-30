-- Promo codes per event (owner, 2026-10-31). Additive only.
-- events.promo_codes: [{ code, kind: 'percent' | 'free_one', percent, from, until, limit }]
-- registrations.promo: the code a registration used, as { code, kind, percent },
-- kept so edits and refunds give the same discount; promo_discount: pesos taken off.
ALTER TABLE events ADD COLUMN IF NOT EXISTS promo_codes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS promo jsonb;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS promo_discount integer;
CREATE INDEX IF NOT EXISTS registrations_promo_code_idx ON registrations (event_id, (promo->>'code')) WHERE promo IS NOT NULL;
