-- Invitation cards (owner, 2026-11-11): a letter can be an invitation card instead
-- of a typed letter. { "on": bool, "card": "/api/event-image/<id>" (the blank card
-- art, 4:5), "pages": ["/api/event-image/<id>", …] (up to 3 pages after the card,
-- e.g. Attire, Beneficiaries), "y": 0..1 (where the guest's name sits, share of the
-- card's height), "nameSize" / "orgSize": text heights in pixels at 1080 wide }.
-- Additive only.
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS invitation jsonb;
