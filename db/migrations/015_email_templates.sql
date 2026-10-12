-- HOR's own wording for the welcome emails (admin: Email templates). One row
-- per template key; no row means the built-in default in emailTemplates.mjs.
CREATE TABLE email_templates (
  key         text PRIMARY KEY CHECK (key IN ('member-registered', 'member-welcome')),
  subject     text NOT NULL CHECK (length(subject) <= 150),
  greeting    text NOT NULL DEFAULT '' CHECK (length(greeting) <= 120),
  heading     text NOT NULL CHECK (length(heading) <= 150),
  message     text NOT NULL CHECK (length(message) <= 4000),
  updated_by  text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
