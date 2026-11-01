-- Letters to brands sent before the Brand trackers existed (1 Nov 2026) were for
-- Golden Beginning: tie them to that event so its tracker shows them and no one
-- invites a brand twice. Only fills event_id where it's empty. Additive.
UPDATE letter_sends ls SET event_id = eb.event_id
  FROM event_brands eb
 WHERE ls.event_id IS NULL
   AND eb.event_id = '2d974ade-c0f6-4a01-8540-9049010366cf'
   AND ls.ref = 'supporter:' || eb.supporter_id::text;
