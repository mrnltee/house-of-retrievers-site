-- Brands per event (owner, 2026-11-01): Sponsors & partners becomes a brand
-- directory; each event's Brand tracker holds who was invited, their reply and
-- what they give for that event. Additive only; the backfill only INSERTs.
CREATE TABLE IF NOT EXISTS event_brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  supporter_id    uuid NOT NULL REFERENCES supporters(id),
  role            text NOT NULL CHECK (role IN ('Partner', 'Sponsor')),
  reply           text NOT NULL DEFAULT 'waiting' CHECK (reply IN ('waiting', 'yes', 'no')),
  follow_up_on    date,
  gives           text[] NOT NULL DEFAULT '{}',
  cash_amount     integer CHECK (cash_amount >= 0),
  in_kind_value   integer CHECK (in_kind_value >= 0),
  in_kind_note    text CHECK (length(in_kind_note) <= 300),
  booth_needs     text CHECK (length(booth_needs) <= 500),
  reps_attending  smallint CHECK (reps_attending BETWEEN 0 AND 500),
  dogs_attending  smallint CHECK (dogs_attending BETWEEN 0 AND 500),
  show_amounts    boolean NOT NULL DEFAULT false,
  notes           text CHECK (length(notes) <= 2000),
  replied_at      timestamptz,
  added_by        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, supporter_id)
);
CREATE INDEX IF NOT EXISTS event_brands_supporter ON event_brands (supporter_id);

ALTER TABLE letter_sends ADD COLUMN IF NOT EXISTS event_id uuid;
CREATE INDEX IF NOT EXISTS letter_sends_event ON letter_sends (event_id, ref);

-- Backfill A: brands already listed on events said Yes to those events.
INSERT INTO event_brands (event_id, supporter_id, role, reply, replied_at, added_by)
SELECT DISTINCT ON (l.event_id, s.id) l.event_id, s.id, l.role, 'yes', now(), 'migration 077'
  FROM (
    SELECT e.id AS event_id, n AS name, 'Partner' AS role FROM events e, unnest(e.partners) n
    UNION ALL
    SELECT e.id, n, 'Sponsor' FROM events e, unnest(e.sponsors) n
  ) l
  JOIN supporters s ON s.deleted_at IS NULL AND lower(trim(s.name)) = lower(trim(l.name))
ON CONFLICT (event_id, supporter_id) DO NOTHING;

-- Backfill B: the Brand Tracker sheet (imported 1 Nov 2026) was for Golden Beginning.
INSERT INTO event_brands (event_id, supporter_id, role, reply, replied_at, follow_up_on, booth_needs, reps_attending, dogs_attending, notes, added_by)
SELECT e.id, s.id, s.kind,
       CASE s.rsvp_status WHEN 'confirmed' THEN 'yes' WHEN 'declined' THEN 'no' ELSE 'waiting' END,
       CASE WHEN s.rsvp_status IN ('confirmed', 'declined') THEN now() END,
       s.follow_up_on, s.booth_needs, s.reps_attending, s.dogs_attending,
       nullif(concat_ws(' · ',
         'Assigned to ' || s.assigned_to,
         'Agreement: ' || s.agreement_status,
         'Invite: ' || s.invite_status,
         'Invited on ' || s.invited_on), ''),
       'migration 077 (Brand Tracker)'
  FROM supporters s
  JOIN events e ON e.id = '2d974ade-c0f6-4a01-8540-9049010366cf'
 WHERE s.deleted_at IS NULL AND s.kind IN ('Partner', 'Sponsor')
   AND (s.invite_status IS NOT NULL OR s.rsvp_status IS NOT NULL OR s.agreement_status IS NOT NULL
        OR s.invited_on IS NOT NULL OR s.follow_up_on IS NOT NULL OR s.assigned_to IS NOT NULL
        OR s.booth_needs IS NOT NULL OR s.reps_attending IS NOT NULL OR s.dogs_attending IS NOT NULL)
ON CONFLICT (event_id, supporter_id) DO UPDATE SET
  follow_up_on   = coalesce(event_brands.follow_up_on, EXCLUDED.follow_up_on),
  booth_needs    = coalesce(event_brands.booth_needs, EXCLUDED.booth_needs),
  reps_attending = coalesce(event_brands.reps_attending, EXCLUDED.reps_attending),
  dogs_attending = coalesce(event_brands.dogs_attending, EXCLUDED.dogs_attending),
  notes          = coalesce(event_brands.notes, EXCLUDED.notes);

-- Names on events that match no directory brand: listed in the build log.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT e.title, n AS name FROM events e, unnest(e.partners || e.sponsors) n
     WHERE NOT EXISTS (SELECT 1 FROM supporters s WHERE s.deleted_at IS NULL AND lower(trim(s.name)) = lower(trim(n)))
  LOOP
    RAISE NOTICE 'Not in the brand directory: "%" (on %)', r.name, r.title;
  END LOOP;
END $$;
