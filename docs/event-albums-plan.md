# Event albums: plan and status

Copied from the owner's planning notes (10 Oct 2026) so every agent working in
this repo has it. Phase 1 below is live on production.

## Built (phase 1)

- Cloudinary (free plan) connected. `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
  and `CLOUDINARY_API_SECRET` are in Vercel for Production and Preview.
- Past events: the editor drops sign-ups for any event dated before today, and
  the server enforces it.
- Admin album uploads for past events: an Album card in the event editor. Many
  photos at once, each shrunk on the device first (longest side 2000 px, WebP,
  location data removed), with Cloudinary capping the size again on arrival
  (`c_limit` 2000, `q_auto:good`). Each photo has a description and Remove.
  Deleting an event also removes its album from Cloudinary.
- Public: past event pages show a "Photos" grid (640 px copies, `f_auto`/`q_auto`)
  and a full-screen viewer (arrow keys, swipe, Esc).
- Table `event_photos` (migration 006), with `source` (admin | participant) and
  `status` (approved | pending | rejected), ready for participant uploads.
- Also shipped with it: an editable event web address (old links forward),
  deleting an event (blocked once anyone has registered), plus codes and
  coordinates in the venue search, and "Parking nearby" on event pages.

Code: `app/admin/eventPhotos.js` (signed uploads, list, describe, remove),
`app/lib/cloudinary.mjs` (+ test).

## Still to build (phase 2)

- Participant uploads through a share link per event
  (`events.houseofretrieversph.org/share/<token>`), with an approval queue.
- Reordering photos, choosing an album photo as the cover, and Gemini-suggested
  descriptions for album photos.
- A photo count on "Where we have been" cards, and an "Ask us to remove a photo" link.

## Decisions (owner, 10 Oct 2026)

1. **Storage: Cloudinary, free plan.** The free Neon database holds covers but
   not full albums.
2. **Participant uploads: a share link per event.** The admin opens an upload
   link (with a QR) for one event, posts it in the group chat, and can close it
   at any time.
3. **Approval: every participant photo waits for an admin** before it appears.
   Admin uploads go live straight away.
4. **Photos are shrunk before storage** to fit more in the free plan.

## HOR to do

- Enter the past events in the admin (Events → New, with the past date): Pawres
  de Mayo, International Free Hugs Day, Basic Embroidery Class, Visit to
  Milagros Elderly Shelter, Pack walk with Beagle Buddies PH, FreeHugs at BGC.
  They fill "Where we have been", and each gets an Album card.
- Then put each event's slug into `event:` in `app/content/journey.js`, so the
  main-site timeline cards link to them.

## Participant upload design (next)

- `event_upload_links`: event, random token, open/closed, optional closing
  date, created by.
- Upload page: works only while the link is open. The visitor picks photos,
  adds a name for credit (optional), and ticks "I took these or have
  permission" and "the people in them are happy for them to be shared". The
  same shrinking as admin uploads. The server signs each upload only for an
  open token, with a rate limit, a file-count cap and an image-type check.
- Thank-you message: "Thanks! Your photos will appear once the team has had a look."
- Admin: open or close the link, copy it or show its QR, and an approval queue
  with a count badge in the menu. Every action goes in the activity log. Every
  action uses `ConfirmButton`.

## Privacy notes

- Event photos show people, children and care-home residents. Approval comes
  first, and a removal request has a clear path.
- Volunteers under 18 must be with a guardian. Do not credit minors by name.
- The upload form collects a name only (optional), no email.
