-- Beneficiaries per event (owner, 2026-11-01): a charity event picks its
-- beneficiaries from the Beneficiaries list; the event page shows them as
-- "Where your support goes". Additive; the backfill only INSERTs.
CREATE TABLE IF NOT EXISTS event_beneficiaries (
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  beneficiary_id  uuid NOT NULL REFERENCES beneficiaries(id),
  position        smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, beneficiary_id)
);
CREATE INDEX IF NOT EXISTS event_beneficiaries_beneficiary ON event_beneficiaries (beneficiary_id);

-- Existing charity events: match their "For" text to the list by name (either may be the shorter one).
INSERT INTO event_beneficiaries (event_id, beneficiary_id)
SELECT e.id, b.id FROM events e JOIN beneficiaries b ON b.deleted_at IS NULL
 WHERE e.is_charity AND length(trim(coalesce(e.supports, ''))) >= 4
   AND (lower(e.supports) LIKE '%' || lower(trim(b.name)) || '%' OR lower(b.name) LIKE '%' || lower(trim(e.supports)) || '%')
ON CONFLICT DO NOTHING;
