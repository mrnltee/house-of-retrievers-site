-- People become one record per person and kind: repeat Join submissions fold
-- into the first one. Adds photos (a small copy, admin-only), membership
-- status with a member number, and a count of how often someone joined.

ALTER TABLE people ADD COLUMN joined_count integer NOT NULL DEFAULT 1;
ALTER TABLE people ADD COLUMN last_joined_at timestamptz;

-- Merge existing duplicates (same email, same kind) into the earliest row.
-- Messages and notes are kept (joined in order); the latest contact details
-- win; a follow-up status other than "New" is kept.
WITH grouped AS (
  SELECT kind, lower(email) AS e, count(*) AS n,
         (array_agg(id ORDER BY created_at))[1] AS keep_id,
         max(created_at) AS last_at,
         (array_agg(name ORDER BY created_at DESC))[1] AS name,
         (array_agg(social_profile ORDER BY created_at DESC) FILTER (WHERE social_profile IS NOT NULL))[1] AS social_profile,
         (array_agg(social_url ORDER BY created_at DESC) FILTER (WHERE social_url IS NOT NULL))[1] AS social_url,
         (array_agg(organization ORDER BY created_at DESC) FILTER (WHERE organization IS NOT NULL))[1] AS organization,
         (array_agg(furbaby_name ORDER BY created_at DESC) FILTER (WHERE furbaby_name IS NOT NULL))[1] AS furbaby_name,
         string_agg(message, E'\n\n' ORDER BY created_at) FILTER (WHERE coalesce(message, '') <> '') AS message,
         string_agg(notes, E'\n' ORDER BY created_at) FILTER (WHERE coalesce(notes, '') <> '') AS notes,
         (array_agg(status ORDER BY updated_at DESC) FILTER (WHERE status <> 'New'))[1] AS status
  FROM people GROUP BY kind, lower(email) HAVING count(*) > 1
)
UPDATE people p SET
  name = g.name,
  social_profile = g.social_profile,
  social_url = g.social_url,
  organization = g.organization,
  furbaby_name = g.furbaby_name,
  message = g.message,
  notes = g.notes,
  status = coalesce(g.status, p.status),
  joined_count = g.n,
  last_joined_at = g.last_at,
  updated_at = now()
FROM grouped g WHERE p.id = g.keep_id;

DELETE FROM people p USING people k
WHERE p.kind = k.kind AND lower(p.email) = lower(k.email)
  AND (k.created_at, k.id) < (p.created_at, p.id);

CREATE UNIQUE INDEX people_one_per_email ON people (kind, lower(email));

-- A small copy of the photo offered with the Join form, for the admin only.
-- The full photo stays in the HOR Drive folder.
CREATE TABLE person_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   uuid NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  mime        text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data        bytea NOT NULL,
  bytes       integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX person_photos_person ON person_photos (person_id, created_at DESC);
ALTER TABLE people ADD COLUMN photo_id uuid REFERENCES person_photos (id) ON DELETE SET NULL;

-- Membership (Members only): applicant → active → inactive / left. The member
-- number and "member since" are set the first time someone becomes active.
ALTER TABLE people ADD COLUMN membership text CHECK (membership IN ('applicant', 'active', 'inactive', 'left'));
UPDATE people SET membership = 'applicant' WHERE kind = 'Member';
ALTER TABLE people ADD COLUMN member_since date;
CREATE SEQUENCE people_member_no START 1;
ALTER TABLE people ADD COLUMN member_no integer UNIQUE;
