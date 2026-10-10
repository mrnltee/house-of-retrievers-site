-- The YY in HOR-YY-NNNN is the year someone registered (sent the Join form,
-- Manila time), not the year an admin activated them. Existing members are
-- renumbered within their registration year, in registration order.

UPDATE people
   SET member_year = extract(year FROM created_at AT TIME ZONE 'Asia/Manila')::smallint
 WHERE member_no IS NOT NULL;

-- Two passes so the unique (member_year, member_no) index never sees a clash mid-update.
UPDATE people SET member_no = -member_no WHERE member_no IS NOT NULL;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY member_year ORDER BY created_at, id) AS n
    FROM people
   WHERE member_no IS NOT NULL
)
UPDATE people p SET member_no = ordered.n FROM ordered WHERE p.id = ordered.id;
