-- Complimentary registrations (owner, 2026-11-11): guests, VIPs and organizers
-- an admin adds with no price. They don't count toward the event's capacity or
-- any Early Bird / first-N ticket. NULL = an ordinary registration.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS comp_type text;
DO $$ BEGIN
  ALTER TABLE registrations ADD CONSTRAINT registrations_comp_type_check CHECK (comp_type IS NULL OR comp_type IN ('guest', 'vip', 'organizer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
