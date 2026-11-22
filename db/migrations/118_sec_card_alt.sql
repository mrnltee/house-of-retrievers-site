-- The "Registered with the SEC" timeline photo is now HoR's own card
-- (logo, organization name, SEC registration number) instead of a photo of
-- the BIR Certificate of Registration. Same file path, so only the alt text
-- changes; rows HoR has edited since keep their own wording.
UPDATE journey_entry_photos
SET alt = 'HoR’s “Registered with the Securities and Exchange Commission” card: The House of Retrievers’ Society, Inc., SEC Registration No. 2026090268846-04'
WHERE static_src = '/journey/sec-registration/1.jpg'
  AND alt = 'The top of the society’s BIR Certificate of Registration, dated September 21, 2026';
