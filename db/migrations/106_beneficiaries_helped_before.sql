-- "Helped before we registered" (owner, 2026-11-15): two groups the community
-- helped informally before HOR was a registered society, added so the website
-- can honour them. Status 'helped' is plain text (no CHECK on status), so no
-- schema change. Added switched OFF the website: HOR checks the wording, adds
-- a logo and switches "Show on the website" on. Skipped if a record with a
-- matching name already exists. Additive only.
INSERT INTO beneficiaries (name, kind, status, description, notes, blurb, show_on_site, created_by)
SELECT 'MBY Pet Rescue and Sanctuary', 'rescue', 'helped',
  'Pet rescue and sanctuary. Beneficiary of Pawres de Mayo (17 May 2026, Parklinks Pet Park), our first gathering.',
  'Helped informally before HOR''s SEC registration; not coordinating now. Added 15 Nov 2026 to honour them on the website. Check the wording, add their logo, then switch on "Show on the website".',
  'A rescue and sanctuary for animals in need. Pawres de Mayo, our very first gathering at Parklinks Pet Park in May 2026, was held for their rescues.',
  false, 'migration 106'
WHERE NOT EXISTS (SELECT 1 FROM beneficiaries WHERE deleted_at IS NULL AND lower(name) LIKE '%mby%');

INSERT INTO beneficiaries (name, kind, status, description, notes, blurb, show_on_site, created_by)
SELECT 'Milagros Elderly Home Care and Services', 'elderly', 'helped',
  'Home care and services for the elderly. Our members and their golden retrievers visited the residents in August 2026 (Purpose to Care).',
  'Helped informally before HOR''s SEC registration; not coordinating now. Added 15 Nov 2026 to honour them on the website. Check the name and wording, add their logo, then switch on "Show on the website".',
  'A home for the elderly and the people who care for them. In August 2026 our members and their golden retrievers spent time with the residents, sharing the quiet comfort a dog''s company brings.',
  false, 'migration 106'
WHERE NOT EXISTS (SELECT 1 FROM beneficiaries WHERE deleted_at IS NULL AND lower(name) LIKE '%milagros%');
