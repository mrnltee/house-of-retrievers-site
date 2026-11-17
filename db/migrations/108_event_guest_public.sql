-- Speakers and special guests on the event page (17 Nov 2026, owner).
-- A guest on an event's Guest list can be shown publicly on that event's page, but only when HoR switches it on
-- and the guest has replied Coming. What the public sees is set here, per event, and nothing else from the
-- guest record (email, phone, notes, representative, private photo) is ever shown.
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS show_on_site boolean NOT NULL DEFAULT false;
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS public_role text CHECK (length(public_role) <= 40);
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS public_intro text CHECK (length(public_intro) <= 200);
-- A picture uploaded for the public page (a public event_images row), never the guest's private photo.
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS public_photo text;
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS public_link text CHECK (length(public_link) <= 300);
