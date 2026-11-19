-- Owner, 19 Nov 2026: put HoR's upcoming December 2026 event on the home page's "Our journey" timeline,
-- published, as admin → Journey timeline → "+ Add from an event" would (title, place, short story, date
-- from the event). Only published events dated in December 2026 that aren't on the timeline yet; the stop
-- shows the event's poster until photos are added (loadJourney). Runs once.
INSERT INTO journey_entries (slug, event_id, title, place, story, happened_on, status, updated_by)
SELECT left(regexp_replace(lower(e.slug), '[^a-z0-9-]', '-', 'g'), 80),
       e.id,
       left(e.title, 120),
       NULLIF(left(concat_ws(', ', NULLIF(e.venue, ''), NULLIF(e.city, '')), 160), ''),
       NULLIF(CASE WHEN length(e.summary) > 400 THEN left(e.summary, 399) || '…' ELSE e.summary END, ''),
       e.date::date,
       'published',
       'migration 115'
  FROM events e
 WHERE e.status = 'published'
   AND e.date::date BETWEEN DATE '2026-12-01' AND DATE '2026-12-31'
   AND NOT EXISTS (SELECT 1 FROM journey_entries j WHERE j.event_id = e.id)
   AND NOT EXISTS (SELECT 1 FROM journey_entries j WHERE j.slug = left(regexp_replace(lower(e.slug), '[^a-z0-9-]', '-', 'g'), 80));
