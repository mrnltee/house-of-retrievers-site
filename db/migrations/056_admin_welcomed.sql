-- First-time admin guide (owner, 2026-10-27): set when the person first opens
-- Getting started, so the welcome box on every page stops showing.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS welcomed_at timestamptz;
