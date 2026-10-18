-- Custom payment hold lengths: any whole number of minutes up to 7 days, not
-- only the quick picks from 034. Widening the check only; existing values
-- (0, 10, 60, 1440, 2880) all still pass.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_payment_hold_minutes_check;
ALTER TABLE events ADD CONSTRAINT events_payment_hold_minutes_check
  CHECK (payment_hold_minutes BETWEEN 0 AND 10080);

-- "Base (1 hooman + 1 furbaby) + extras" pricing: each tier carries its own
-- extraHumanFee / extraFurbabyFee in price_tiers JSON. Widening only.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_pricing_basis_check;
ALTER TABLE events ADD CONSTRAINT events_pricing_basis_check
  CHECK (pricing_basis IN ('registration', 'human', 'furbaby', 'bundle', 'human_plus_furbaby', 'tiered', 'base_plus'));
