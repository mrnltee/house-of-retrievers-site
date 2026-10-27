-- Per-person page access (owner, 2026-10-27): the sidebar pages an Owner
-- ticked for this admin. NULL = no ticks saved, so their roles decide.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS pages text[];
