-- The on-screen guide is for first-time admins only (owner, 2026-10-27).
-- Admins who had already signed in before the guide went live (2026-10-27
-- 06:16 UTC) don't get it popping up; they can still open it from
-- Help → Getting started → Show me around. Anyone invited later, or who has
-- never signed in, still sees it until they tick "Don't show this again".
UPDATE admins SET guide_hidden = true
WHERE created_at < '2026-10-27T06:16:40Z' AND last_seen_at IS NOT NULL AND NOT guide_hidden;
