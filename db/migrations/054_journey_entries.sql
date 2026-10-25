-- Journey entries (admin → Settings → Journey timeline): the homepage "Our
-- journey" stops, editable in the admin instead of app/content/journey.js.
-- A stop is linked to an event (its date follows the event; the event save
-- action keeps happened_on in step) or is a standalone milestone. Photos come
-- from exactly one place: Cloudinary (public_id), the files already in
-- public/ (static_src: today's files, e.g. /journey/… or /2-better/…), or the linked event's album (event_photo_id —
-- removed with the album photo, so a stop never shows a deleted picture).
-- Past/upcoming comes from the date, not a hand-set flag. Additive: new tables
-- only. The 11 stops from app/content/journey.js are seeded as published, with
-- their existing photo files, so the live page doesn't change.
CREATE TABLE IF NOT EXISTS journey_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
  event_id    uuid UNIQUE REFERENCES events (id) ON DELETE SET NULL,
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  theme       text CHECK (length(theme) <= 120),
  place       text CHECK (length(place) <= 160),
  story       text CHECK (length(story) <= 400),
  tag         text CHECK (length(tag) <= 40),
  mark        text CHECK (mark IN ('first', 'milestone')),
  happened_on date,
  month       text CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  position    integer NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (happened_on IS NULL OR month IS NULL)
);
CREATE TABLE IF NOT EXISTS journey_entry_photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id       uuid NOT NULL REFERENCES journey_entries (id) ON DELETE CASCADE,
  public_id      text UNIQUE,
  static_src     text CHECK (static_src ~ '^/[A-Za-z0-9_-][A-Za-z0-9._/-]*\.(jpe?g|png|webp|avif)$' AND static_src !~ '\.\.'),
  event_photo_id uuid REFERENCES event_photos (id) ON DELETE CASCADE,
  width          integer CHECK (width > 0),
  height         integer CHECK (height > 0),
  bytes          integer CHECK (bytes > 0),
  alt            text NOT NULL DEFAULT '' CHECK (length(alt) <= 200),
  fit            text NOT NULL DEFAULT 'cover' CHECK (fit IN ('cover', 'contain')),
  position       integer NOT NULL DEFAULT 0,
  uploaded_by    text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- Exactly one source per photo.
  CHECK (num_nonnulls(public_id, static_src, event_photo_id) = 1),
  UNIQUE (entry_id, event_photo_id)
);
CREATE INDEX IF NOT EXISTS journey_entry_photos_entry ON journey_entry_photos (entry_id, position);

-- Today's timeline, from app/content/journey.js (generated once).
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('pawres-de-mayo', 'Pawres de Mayo', NULL, 'Parklinks Pet Park, Pasig', 'Our first Purpose to Celebrate: a day at the park for the benefit of MBY Pet Rescue.', 'Purpose to Celebrate', 'first', NULL, '2026-05', 0, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/1.jpg', 'A host on stage with a baby in a carrier and a golden retriever in a cream dress', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/1.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/2.jpg', 'Two golden retrievers in party dresses grinning at the camera', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/2.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/3.jpg', 'Members and their golden retrievers gathered on the lawn for a group photo', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/4.jpg', 'Two members lifting their golden retrievers up in front of the Parklinks fence', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/5.jpg', 'The pack lined up under the tents with their dogs in costume', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/5.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/pawres-de-mayo/6.jpg', 'A member kneeling with his golden retriever in a gown, holding up a certificate', 'cover', 5, 'migration 054' FROM journey_entries
WHERE slug = 'pawres-de-mayo' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/pawres-de-mayo/6.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('international-free-hugs-day', 'International Free Hugs Day', NULL, 'BGC, Taguig', 'Our first free hugs event with the furbabies front and center. Purpose to Care began here.', 'Purpose to Care', NULL, NULL, '2026-07', 10, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/international-free-hugs-day/1.jpg', 'Members and their golden retrievers sitting in a circle on the lawn at BGC with Free Hugs signs', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'international-free-hugs-day' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/international-free-hugs-day/1.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/international-free-hugs-day/2.jpg', 'Visitors photographing the circle of golden retrievers on the grass', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'international-free-hugs-day' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/international-free-hugs-day/2.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/international-free-hugs-day/3.jpg', 'A golden retriever in a blue dress and bandana resting on the grass beside its owner', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'international-free-hugs-day' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/international-free-hugs-day/3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/international-free-hugs-day/4.jpg', 'Members and their golden retrievers gathered on the lawn in the late afternoon', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'international-free-hugs-day' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/international-free-hugs-day/4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/international-free-hugs-day/5.jpg', 'A woman cupping a smiling golden retriever''s face in her hands', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'international-free-hugs-day' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/international-free-hugs-day/5.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('basic-embroidery-class', 'Basic Embroidery Class', NULL, 'QC', 'An afternoon embroidery class with our partner Pawfect Blooms, and the start of Purpose to Learn.', 'Purpose to Learn', NULL, NULL, '2026-08', 20, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better5.jpg', 'The chalkboard sign for the House of Retrievers private embroidery class', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better5.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better3.jpg', 'A place setting for the embroidery class, marked with a golden retriever place card', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better4.jpg', 'Members seated along the decorated table as the embroidery class begins', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better6.jpg', 'Two members working through a stitch together at the class table', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better6.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better7.jpg', 'A member threading her embroidery hoop at the decorated table', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better7.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/2-better/better8.jpg', 'The group gathered for a photo at the end of the embroidery class', 'cover', 5, 'migration 054' FROM journey_entries
WHERE slug = 'basic-embroidery-class' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/2-better/better8.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('milagros-elderly-shelter', 'Visit to Milagros Elderly Shelter', NULL, NULL, 'A week after the embroidery class, we visited the residents of Milagros Elderly Shelter.', 'Community outreach', NULL, NULL, '2026-08', 30, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/1.jpg', 'House of Retrievers receiving a certificate of appreciation under the Milagros welcome screen', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/1.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/2.jpg', 'Staff, members and golden retrievers together for a group photo at Milagros', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/2.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/3.jpg', 'Golden retrievers in red bandanas greeting residents seated in wheelchairs', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/4.jpg', 'A resident in a wheelchair reaching down to pet a golden retriever', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/5.jpg', 'A caregiver kneeling beside a resident as a golden retriever rests its head on his lap', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/5.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/milagros-elderly-shelter/6.jpg', 'Several hands petting a golden retriever in a blue bandana', 'cover', 5, 'migration 054' FROM journey_entries
WHERE slug = 'milagros-elderly-shelter' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/milagros-elderly-shelter/6.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('beagle-buddies-pack-walk', 'Pack walk with Beagle Buddies PH', NULL, 'Ayala Triangle, Makati', 'Two dog communities, one walk: our first collaboration with another group.', 'First collaboration', 'first', NULL, '2026-08', 40, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/1.jpg', 'Walkers and their dogs filling the road at Ayala Avenue', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/1.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/2.jpg', 'A golden retriever in a sequined bandana walking beside its owner', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/2.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/3.jpg', 'Beagles and their owners in matching shirts leading part of the walk', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/4.jpg', 'A golden retriever in a pink cap walking ahead of the House of Retrievers banner', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/5.jpg', 'Walkers carrying the Beagle Buddies PH flag with beagles on leash', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/5.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/beagle-buddies-pack-walk/6.jpg', 'Beagles and their owners meeting on the sidewalk after the walk', 'cover', 5, 'migration 054' FROM journey_entries
WHERE slug = 'beagle-buddies-pack-walk' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/beagle-buddies-pack-walk/6.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('sec-registration', 'Registered with the SEC', NULL, NULL, 'We’re now officially registered[ as {org}]', 'Milestone', 'milestone', NULL, '2026-09', 50, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/sec-registration/1.jpg', 'The top of the society’s BIR Certificate of Registration, dated September 21, 2026', 'contain', 0, 'migration 054' FROM journey_entries
WHERE slug = 'sec-registration' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/sec-registration/1.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('freehugs-bgc', 'FreeHugs', NULL, 'BGC, Taguig', 'Back at BGC for another round of free hugs.', 'Purpose to Care', NULL, NULL, '2026-09', 60, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/1.jpg', 'Two visitors crouching on the grass to hug a golden retriever', 'cover', 0, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/1.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/2.jpg', 'A woman in pink kneeling to greet a golden retriever and two small white dogs', 'cover', 1, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/2.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/3.jpg', 'A golden retriever with a Free Hugs sign resting on a bench as a boy pets it', 'cover', 2, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/3.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/4.jpg', 'A golden retriever lying on the grass with its eyes half closed', 'cover', 3, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/4.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/5.jpg', 'A child reaching out to a happy golden retriever', 'cover', 4, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/5.jpg');
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/freehugs-bgc/6.jpg', 'A visitor kneeling beside a golden retriever wearing a Free Hugs sign', 'cover', 5, 'migration 054' FROM journey_entries
WHERE slug = 'freehugs-bgc' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/freehugs-bgc/6.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('weekend-social-run', 'Weekend Social Run', NULL, 'Filinvest City, Alabang', NULL, NULL, NULL, '2026-10-11', NULL, 70, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/weekend-social-run/1.jpg', 'Weekend Social Run poster: run, walk, socialize. Sunday, 11 October 2026, 6:00 AM, Filinvest City, Alabang', 'contain', 0, 'migration 054' FROM journey_entries
WHERE slug = 'weekend-social-run' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/weekend-social-run/1.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('bedazzle-barkdate', 'Bedazzle Barkdate', NULL, 'Wiltlover Café, MetLive Mall, Pasay', NULL, NULL, NULL, '2026-10-17', NULL, 80, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/bedazzle-barkdate/1.jpg', 'Bedazzle Barkdate poster: October 17, 2026, 1:00 to 4:00 PM at Wiltlover Café, MetLive Mall, Pasay. The pass includes a bedazzling kit, a drink, a pastry and a furbaby treat', 'contain', 0, 'migration 054' FROM journey_entries
WHERE slug = 'bedazzle-barkdate' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/bedazzle-barkdate/1.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('retriever-romp', 'Retriever Romp', 'Retrievers’ casual meet-up', 'Parklinks Pet Park, Pasig', NULL, NULL, NULL, '2026-11-08', NULL, 90, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO journey_entry_photos (entry_id, static_src, alt, fit, position, uploaded_by)
SELECT id, '/journey/retriever-romp/1.jpg', 'Retriever Romp poster: a retrievers’ casual meet-up on November 8, 2026, 2:00 to 7:00 PM at Parklinks Pet Park. Three golden retrievers on the grass beside their owner', 'contain', 0, 'migration 054' FROM journey_entries
WHERE slug = 'retriever-romp' AND NOT EXISTS (SELECT 1 FROM journey_entry_photos WHERE static_src = '/journey/retriever-romp/1.jpg');
INSERT INTO journey_entries (slug, title, theme, place, story, tag, mark, happened_on, month, position, status, updated_by)
VALUES ('a-golden-beginning', 'A Golden Beginning: Paws & Purpose', NULL, NULL, 'Details to be announced soon.', NULL, NULL, NULL, NULL, 100, 'published', 'migration 054')
ON CONFLICT (slug) DO NOTHING;
