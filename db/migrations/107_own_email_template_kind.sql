-- HOR can save its own emails as templates ("Own email") and start from one
-- when ticking "Write my own email (email only)" in the letter send window.
-- Additive: only widens the allowed kinds.
ALTER TABLE custom_email_templates DROP CONSTRAINT IF EXISTS custom_email_templates_kind_check;
ALTER TABLE custom_email_templates ADD CONSTRAINT custom_email_templates_kind_check
  CHECK (kind IN ('acceptance', 'event', 'reminder', 'own'));
