-- Admin profiles (owner, 2026-10-31): first name, furbaby's name, photo and
-- how their name shows (full name, or "First / Furbaby"). Additive only.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name text CHECK (length(first_name) <= 60);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS furbaby_name text CHECK (length(furbaby_name) <= 60);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo text CHECK (length(photo) <= 300);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS show_as text NOT NULL DEFAULT 'full' CHECK (show_as IN ('full', 'first'));
CREATE INDEX IF NOT EXISTS activity_log_actor ON activity_log (actor_email, at DESC);
