-- HOR can write its own event reminder / guidelines emails (one per event or
-- occasion), picked in the "Email participants" composer. Additive: only
-- widens the allowed kinds.
ALTER TABLE custom_email_templates DROP CONSTRAINT IF EXISTS custom_email_templates_kind_check;
ALTER TABLE custom_email_templates ADD CONSTRAINT custom_email_templates_kind_check
  CHECK (kind IN ('acceptance', 'event', 'reminder'));
