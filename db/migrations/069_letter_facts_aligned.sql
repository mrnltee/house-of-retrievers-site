-- Letters agree on the facts (owner, 2026-10-31): the launch is at 3:00 PM, the
-- event is written "A Golden Beginning: Paws & Purpose", and the organization
-- "The House of Retrievers’ Society, Inc." in sentences (the capitalised
-- signature block is left as it is). Applies to HOR's saved letter wording;
-- the built-in starters were changed in code. Safe to run again.
UPDATE letter_templates SET
  subject = regexp_replace(regexp_replace(replace(subject, '2:00 PM', '3:00 PM'), 'A Golden Beginning ?[-–—] ?Paws & Purpose', 'A Golden Beginning: Paws & Purpose', 'g'), 'The House of Retrievers[’'']? Society,? Inc\.?', 'The House of Retrievers’ Society, Inc.', 'g'),
  cover   = regexp_replace(regexp_replace(replace(cover,   '2:00 PM', '3:00 PM'), 'A Golden Beginning ?[-–—] ?Paws & Purpose', 'A Golden Beginning: Paws & Purpose', 'g'), 'The House of Retrievers[’'']? Society,? Inc\.?', 'The House of Retrievers’ Society, Inc.', 'g'),
  body    = regexp_replace(regexp_replace(replace(body,    '2:00 PM', '3:00 PM'), 'A Golden Beginning ?[-–—] ?Paws & Purpose', 'A Golden Beginning: Paws & Purpose', 'g'), 'The House of Retrievers[’'']? Society,? Inc\.?', 'The House of Retrievers’ Society, Inc.', 'g')
WHERE deleted_at IS NULL
  AND (subject || cover || body) ~ '2:00 PM|A Golden Beginning ?[-–—] ?Paws|The House of Retrievers[’'']? Society,? Inc';
