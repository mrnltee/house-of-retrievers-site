-- Ticket-specific attendance rules are stored in the existing price_tiers JSON.
-- Widen the event basis check without changing the behavior of existing events.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_pricing_basis_check;
ALTER TABLE events ADD CONSTRAINT events_pricing_basis_check
  CHECK (pricing_basis IN ('registration', 'human', 'furbaby', 'bundle', 'human_plus_furbaby', 'tiered'));
