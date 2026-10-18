-- Names of the other hoomans on an RSVP (hooman 1 is the registrant's own
-- name). One entry per extra person, '' where skipped; NULL when none typed.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS guest_names text[];
