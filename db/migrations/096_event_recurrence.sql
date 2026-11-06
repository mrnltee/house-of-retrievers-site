-- Repeating events (owner, 2026-11-07). Replaces the event-type idea of 095:
-- an event's Category now decides whether it is an activity (Socials, Workshops,
-- Wellness: no guest list, "Participants") and repeating is its own setting.
-- recurrence = {"nth": 1-4 or -1 (last), "weekday": 0-6 (Sunday 0), "month": 0 (every month) or 1-12 (yearly)},
-- kept on every event of the series (series_id, added in 095) so the admin can show the rule.
-- events.event_type (095) is no longer read or written; it stays because 095 is already applied
-- to the shared database, and every row in it is the default 'standard'.
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence jsonb;
