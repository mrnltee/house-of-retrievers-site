-- Letter signature (owner, 2026-10-31): an optional signature image laid over
-- the PDF where the letter has a {signature} marker, with its position and size:
-- { "on": bool, "image": "/api/event-image/<id>", "x": 0..1 (share of the text
-- width from the left), "dy": points up (-) or down (+) from the marker, "width": points }.
-- Additive only.
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS signature jsonb;
