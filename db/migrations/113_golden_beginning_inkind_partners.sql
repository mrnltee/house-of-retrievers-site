-- Owner, 19 Nov 2026: the brands on A Golden Beginning's Brand tracker that were Sponsors are in-kind partners.
-- Only that event; other events and brands are untouched. Runs once (recorded in schema_migrations).
UPDATE event_brands eb
   SET role = 'Partner', partner_type = 'in-kind', sponsor_level = NULL
  FROM events e
 WHERE e.id = eb.event_id
   AND e.slug = 'golden-beginning-paws-and-purpose-2026-11'
   AND eb.role = 'Sponsor';
