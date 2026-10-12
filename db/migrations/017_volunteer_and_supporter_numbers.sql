-- ID numbers per kind (12 Oct 2026):
--   Members     HOR-YY-NNNN
--   Volunteers  HORV-YY-NNNN   (volunteers now have membership too)
--   Sponsors / partners  HOR-XXX-YY-NNNN, XXX = the organisation's own 3-letter code
-- YY is the year they registered (Manila); NNNN restarts at 0001 each year,
-- counted separately for members, volunteers, and sponsors+partners.

-- Volunteers go through applicant → active → inactive / left like members.
UPDATE people SET membership = 'applicant' WHERE kind = 'Volunteer' AND membership IS NULL;

-- Members and volunteers count separately, so the same year + number can exist once per kind.
DROP INDEX IF EXISTS people_member_year_no;
CREATE UNIQUE INDEX people_kind_member_year_no ON people (kind, member_year, member_no) WHERE member_no IS NOT NULL;

ALTER TABLE supporters ADD COLUMN code text CHECK (code ~ '^[A-Z]{3}$');
ALTER TABLE supporters ADD COLUMN number_year smallint;
ALTER TABLE supporters ADD COLUMN number_no integer CHECK (number_no >= 1);
ALTER TABLE supporters ADD CONSTRAINT supporters_number_with_year CHECK ((number_no IS NULL) = (number_year IS NULL));
CREATE UNIQUE INDEX supporters_one_per_code ON supporters (code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX supporters_year_no ON supporters (number_year, number_no) WHERE number_no IS NOT NULL;
