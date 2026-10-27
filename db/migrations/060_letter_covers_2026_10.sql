-- New covering emails for the eight letters (owner's brief, 2026-10-27). The
-- new wording lives in app/lib/letters/starters.mjs. A saved letter row still
-- holding the OLD starter subject or cover would hide it, so those fields
-- are cleared to fall back to the new starter. Anything HOR rewrote itself is
-- left exactly as it is. The letter text (body) is not touched.
UPDATE letter_templates SET cover = '' WHERE key = 'sponsorship-letter' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “An Invitation to Help Create a Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'sponsorship-letter' AND subject = 'An Invitation to Help Create a Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'donation-letter' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “An Invitation to Help Create a Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'donation-letter' AND subject = 'An Invitation to Help Create a Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'xdeal-proposal' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “An Invitation to Help Create a Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'xdeal-proposal' AND subject = 'An Invitation to Help Create a Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'invite-guests-of-honor' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “Invitation as Guests of Honor - A Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'invite-guests-of-honor' AND subject = 'Invitation as Guests of Honor - A Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'invite-guest-speaker' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “Invitation as Guest Speaker - A Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'invite-guest-speaker' AND subject = 'Invitation as Guest Speaker - A Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'invite-special-guest' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “Your Presence, Their Voice - A Golden Beginning,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'invite-special-guest' AND subject = 'Your Presence, Their Voice - A Golden Beginning';
UPDATE letter_templates SET cover = '' WHERE key = 'invite-media' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “The Furparents Behind the Familiar Faces - An Invitation to Cover,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'invite-media' AND subject = 'The Furparents Behind the Familiar Faces - An Invitation to Cover';
UPDATE letter_templates SET cover = '' WHERE key = 'invite-creators' AND cover = 'Dear [Company Name],

Warm greetings from House of Retrievers. Please find attached our letter, “A Place in the Story — A Limited Creator Invitation,” for your consideration.

We would be glad to answer any questions. Simply reply to this email.';
UPDATE letter_templates SET subject = '' WHERE key = 'invite-creators' AND subject = 'A Place in the Story — A Limited Creator Invitation';
