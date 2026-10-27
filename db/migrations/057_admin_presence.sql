-- Online / offline on the Admins page (owner, 2026-10-27): when each admin
-- last had the admin open. Updated at most once a minute while they use it.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
