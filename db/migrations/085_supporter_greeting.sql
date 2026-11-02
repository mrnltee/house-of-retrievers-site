-- How letters greet a brand (owner, 2026-11-02): its contact person, the brand's
-- team ("Dear Apple team,"), or HOR's own wording (salutation). 'auto' keeps the
-- old rule: own wording if typed, else the contact person, else the team. Additive.
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS greeting text NOT NULL DEFAULT 'auto'
  CHECK (greeting IN ('auto', 'contact', 'team', 'custom'));
