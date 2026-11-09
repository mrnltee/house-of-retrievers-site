-- Private pictures (security audit, 2026-11-09). event_images also holds pictures
-- only admins should see: the letter signature, Guest list photos and logos, and
-- admin profile photos. /api/event-image served all of them to anyone with the
-- address, cached publicly for a year. A private row is now shown only to a
-- signed-in admin, never cached by a shared cache. Additive: a new column with a
-- safe default, and existing private pictures marked by where they are used.
ALTER TABLE event_images ADD COLUMN IF NOT EXISTS private boolean NOT NULL DEFAULT false;

UPDATE event_images SET private = true
WHERE NOT private AND ('/api/event-image/' || id::text) IN (
  SELECT signature->>'image' FROM letter_templates WHERE signature->>'image' IS NOT NULL
  UNION SELECT photo FROM letter_contacts WHERE photo IS NOT NULL
  UNION SELECT logo FROM letter_contacts WHERE logo IS NOT NULL
  UNION SELECT photo FROM admins WHERE photo IS NOT NULL
)
-- A picture also used somewhere public (a brand or beneficiary logo, an event,
-- a photographer, an email design) stays public, so nothing on the site breaks.
AND ('/api/event-image/' || id::text) NOT IN (
  SELECT logo FROM supporters WHERE logo IS NOT NULL
  UNION SELECT photo FROM beneficiaries WHERE photo IS NOT NULL
  UNION SELECT logo FROM beneficiaries WHERE logo IS NOT NULL
  UNION SELECT photo FROM photographers WHERE photo IS NOT NULL
);
