-- Email designs (owner, 2026-11-04): block-built emails for brand outreach (header,
-- body, footer as jsonb), five kinds, a library (event_id null) and event copies
-- (event_id, based_on). One 'house' row holds HOR's shared header and footer.
-- letter_sends records which design a send used. Additive only.
CREATE TABLE IF NOT EXISTS email_designs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('invite-cover', 'invite-full', 'follow-up', 'thanks-yes', 'thanks-no', 'house')),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  subject     text NOT NULL DEFAULT '' CHECK (length(subject) <= 150),
  doc         jsonb NOT NULL,
  event_id    uuid REFERENCES events (id) ON DELETE CASCADE,
  based_on    uuid,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_designs_one_house ON email_designs ((kind)) WHERE kind = 'house';
CREATE INDEX IF NOT EXISTS email_designs_event ON email_designs (event_id);

ALTER TABLE letter_sends ADD COLUMN IF NOT EXISTS design_id uuid;
