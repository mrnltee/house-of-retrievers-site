-- Brand tracker merge (owner, 2026-11-01): the outreach columns of HOR's
-- "Brand Tracker" sheet live on the sponsor/partner record, next to the
-- contact and support details that were already here. Additive only.
--   Invitation Status, RSVP Status, Agreement Status, Invitation Date,
--   Follow-up Date, Assigned Team Member, Booth Requirements,
--   Representatives / Dogs Attending (= Expected Hoomans / Dogs).
-- Booth (Participation Type / Booth Requested?) is a new "What they give"
-- option; gives is a free text[] so it needs no change here.
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS invite_status text
  CHECK (invite_status IN ('not_sent', 'to_invite', 'sent', 'follow_up', 'replied'));
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS rsvp_status text
  CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'tentative', 'no_response'));
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS agreement_status text
  CHECK (agreement_status IN ('not_started', 'sent', 'signed', 'not_applicable'));
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS invited_on date;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS follow_up_on date;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS assigned_to text CHECK (length(assigned_to) <= 120);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS booth_needs text CHECK (length(booth_needs) <= 500);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS reps_attending smallint CHECK (reps_attending BETWEEN 0 AND 500);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS dogs_attending smallint CHECK (dogs_attending BETWEEN 0 AND 500);
