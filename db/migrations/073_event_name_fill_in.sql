-- The event's name is a fill-in (owner, 2026-10-31): letters say [Event Name]
-- (“A Golden Beginning: Paws & Purpose”) and [Event Short Name] (“A Golden Beginning”), set once in
-- Letters → Standard details and filled in by themselves. Applied to HOR's saved
-- letters; the built-in letters were changed in code. Safe to run again.
UPDATE letter_templates SET
  subject = replace(replace(subject, 'A Golden Beginning: Paws & Purpose', '[Event Name]'), 'A Golden Beginning', '[Event Short Name]'),
  cover = replace(replace(cover, 'A Golden Beginning: Paws & Purpose', '[Event Name]'), 'A Golden Beginning', '[Event Short Name]'),
  body = replace(replace(body, 'A Golden Beginning: Paws & Purpose', '[Event Name]'), 'A Golden Beginning', '[Event Short Name]')
WHERE deleted_at IS NULL AND (subject || cover || body) LIKE '%A Golden Beginning%';

INSERT INTO letter_saved_values (label, value, standard, updated_by, updated_at) VALUES
  ('Event Name', 'A Golden Beginning: Paws & Purpose', true, 'migration 073', now()),
  ('Event Short Name', 'A Golden Beginning', true, 'migration 073', now())
ON CONFLICT (label) DO NOTHING;
