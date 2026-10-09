-- Phase 1 of the admin module: admins, activity log, events, registrations,
-- people from the Join form, and payment details with two-Owner approval.
-- Applied by scripts/migrate.mjs, which records each file in schema_migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Who may sign in. Owners named in ADMIN_OWNER_EMAILS are also let in and are
-- upserted here on first sign-in, so the first Owner never locks themselves out.
CREATE TABLE admins (
  email         text PRIMARY KEY CHECK (email = lower(email)),
  name          text,
  roles         text[] NOT NULL DEFAULT '{}',
  active        boolean NOT NULL DEFAULT true,
  invited_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
);

-- Append-only. The app never updates or deletes a row here.
CREATE TABLE activity_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_email text NOT NULL,
  action      text NOT NULL,
  target      text,
  details     jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX activity_log_at ON activity_log (at DESC);

CREATE TABLE events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  category        text NOT NULL,
  date            date NOT NULL,
  start_time      text,
  end_time        text,
  venue           text NOT NULL DEFAULT '',
  city            text NOT NULL DEFAULT '',
  cost            text,
  supports        text,
  summary         text,
  image           text,
  image_alt       text,
  -- 'none': come along, no sign-up. 'required': RSVP through the site.
  registration    text NOT NULL DEFAULT 'none' CHECK (registration IN ('none', 'required')),
  capacity        integer CHECK (capacity IS NULL OR capacity > 0),
  rsvp_open       boolean NOT NULL DEFAULT true,
  fee_required    boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_date ON events (date);

CREATE TABLE registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  furbaby_name    text,
  photo_consent   boolean NOT NULL,
  under_18        boolean NOT NULL DEFAULT false,
  guardian_name   text,
  status          text NOT NULL CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  fee_status      text NOT NULL DEFAULT 'not_due' CHECK (fee_status IN ('not_due', 'waiting', 'paid')),
  fee_reference   text,
  check_in_code   text NOT NULL UNIQUE,
  checked_in_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT under_18 OR guardian_name IS NOT NULL)
);
CREATE INDEX registrations_event ON registrations (event_id, created_at);
-- One live registration per email per event.
CREATE UNIQUE INDEX registrations_one_per_email
  ON registrations (event_id, lower(email)) WHERE status <> 'cancelled';

CREATE TABLE people (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('Member', 'Volunteer', 'Partner', 'Sponsor')),
  name            text NOT NULL,
  email           text NOT NULL,
  social_profile  text,
  social_url      text,
  organization    text,
  furbaby_name    text,
  message         text,
  status          text NOT NULL DEFAULT 'New',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX people_kind_created ON people (kind, created_at DESC);

-- What the Support panel shows. Only an approved change request writes here.
CREATE TABLE payment_methods (
  key           text PRIMARY KEY CHECK (key IN ('gcash', 'maya', 'qrph', 'bank')),
  enabled       boolean NOT NULL DEFAULT false,
  details       jsonb NOT NULL DEFAULT '{}',
  qr_image      text,
  qr_payload    text,
  updated_at    timestamptz,
  requested_by  text,
  approved_by   text
);
INSERT INTO payment_methods (key) VALUES ('gcash'), ('maya'), ('qrph'), ('bank');

CREATE TABLE payment_change_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_key    text NOT NULL REFERENCES payment_methods (key),
  enabled       boolean NOT NULL,
  details       jsonb NOT NULL,
  qr_image      text,
  qr_payload    text,
  requested_by  text NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by    text,
  decided_at    timestamptz,
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
-- At most one open request per method, so an approver never sees two competing changes.
CREATE UNIQUE INDEX payment_change_one_pending
  ON payment_change_requests (method_key) WHERE status = 'pending';
