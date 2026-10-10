-- Member numbers become HOR-YY-NNNN: the year someone became a member
-- (Manila) plus a sequence that starts again at 0001 each year.
-- Existing members are renumbered within their year in the order they
-- became members, so the first member of 2026 is HOR-26-0001.

ALTER TABLE people ADD COLUMN member_year smallint;

UPDATE people
   SET member_year = extract(year FROM coalesce(member_since, (now() AT TIME ZONE 'Asia/Manila')::date))::smallint
 WHERE member_no IS NOT NULL;

ALTER TABLE people DROP CONSTRAINT IF EXISTS people_member_no_key;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY member_year ORDER BY member_since NULLS LAST, member_no, created_at) AS n
    FROM people
   WHERE member_no IS NOT NULL
)
UPDATE people p SET member_no = ordered.n FROM ordered WHERE p.id = ordered.id;

CREATE UNIQUE INDEX people_member_year_no ON people (member_year, member_no) WHERE member_no IS NOT NULL;
ALTER TABLE people ADD CONSTRAINT people_member_no_with_year CHECK ((member_no IS NULL) = (member_year IS NULL));

DROP SEQUENCE IF EXISTS people_member_no;
