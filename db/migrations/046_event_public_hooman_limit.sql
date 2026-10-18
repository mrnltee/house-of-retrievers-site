-- "Most hoomans from public RSVPs": a people limit beside the dog/registration
-- capacity. NULL = no limit (every existing event).
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_public_humans integer CHECK (max_public_humans BETWEEN 1 AND 10000);
