-- Owner, 19 Nov 2026: Bluehive MDS Events, Inc. and Novotel Manila Araneta City co-present A Golden Beginning.
-- Only their rows on that event's Brand tracker; runs once (recorded in schema_migrations).
UPDATE event_brands eb
   SET role = 'Partner', partner_type = 'co-presenter', sponsor_level = NULL
  FROM events e, supporters s
 WHERE e.id = eb.event_id
   AND s.id = eb.supporter_id
   AND e.slug = 'golden-beginning-paws-and-purpose-2026-11'
   AND (lower(s.name) LIKE 'bluehive%' OR lower(s.name) LIKE 'novotel manila araneta%');
