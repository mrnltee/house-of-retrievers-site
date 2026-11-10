-- Letters: extra CC / BCC typed on the send page (owner, 10 Nov 2026).
-- The extra CC joins the existing cc column; BCC gets its own. Additive only.
ALTER TABLE letter_sends ADD COLUMN IF NOT EXISTS bcc text[];
COMMENT ON COLUMN letter_sends.bcc IS 'Blind copies sent with this letter email (typed on the send page).';
