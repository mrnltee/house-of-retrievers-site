-- First-time admin guide (owner, 2026-10-27): set when the person first opens
-- Getting started, so the welcome box on every page stops showing.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS welcomed_at timestamptz;
-- They ticked "Don't show this again" on the on-screen guide (it shows on
-- every sign-in until then).
ALTER TABLE admins ADD COLUMN IF NOT EXISTS guide_hidden boolean NOT NULL DEFAULT false;
