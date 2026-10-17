# Check-in welcome card with the guest's furbaby photo

Design agreed with the owner on 17 Oct 2026. Read `CLAUDE.md` and `AGENTS.md`
first; their rules (staging first, additive migrations on the shared database,
confirm dialogs on every admin action, private photos) all apply.

## Why

A successful scan at the door currently shows a generic dark card with a gold
star, "You're checked in!" and "{name} is all set…". HOR wants the moment to feel
personal: the guest is greeted by name, for this event, with their own furbaby's
photo. It is a small piece of hospitality that matches the brand ("Good dogs.
Good people.") and makes the door feel like a welcome rather than a ticket check.

## Goals

- On a successful check-in, the door screen shows a **welcome card** (layout
  "A", chosen from mockups) instead of today's success card:
  1. The furbaby photo in a circle with a gold ring (same ring weight as the
     card border). If there is no photo, the guest's **initials** in the same
     circle (gold serif letters on a dark warm fill).
  2. "WELCOME TO" in small gold caps.
  3. The event title (serif).
  4. The guest's name, large (serif).
  5. *Builder's call, flagged to the owner:* a small "with {furbaby name}" line
     when the RSVP has a furbaby name; omitted otherwise.
  6. A **customizable message line** under the name (owner's decision, 17 Oct
     2026). It is the existing per-event success message
     (`events.checkin_success_message`) in the Check-in experience settings:
     - HOR can rewrite it, or **leave it empty to show no line at all**.
     - An event that has never set it (NULL) shows the warm default, "Welcome
       in. Have a wonderful time together.", and the editor pre-fills that
       default. An event saved with an empty message stores `''` and shows
       nothing. Today the save action turns blank into the default; that changes
       so blank stays blank. Events already saved with the default text keep
       showing it until HOR edits it.
     - Clamped to two lines on screen (builder's call; the stored 300-character
       limit is unchanged).
     The existing custom success **title** is replaced by this fixed layout:
     keep the column, stop showing it on the card, and remove the title input
     from the editor without wiping saved values.
  7. The existing "Ready for the next guest" button closes it.
- It must read well on a phone, tablet or laptop, and be legible to the guest
  standing in front of the device (the door team may turn the screen toward
  them). Keep the existing card's colours, border, shadow, entrance animation and
  `prefers-reduced-motion` behaviour.
- **Where the photo comes from, in priority order:**
  1. A photo the team set for this RSVP (always wins).
  2. Otherwise the photo on the matching **People** record (`people.photo_id` →
     `person_photos`), matched automatically.
  3. Otherwise initials.
  The team can also deliberately choose "no photo" for an RSVP, which forces
  initials even when a People match exists.
- **Automatic matching** (builder's call, approved in principle by the owner):
  match the RSVP to People when the email **and** the normalised name both match
  (same normalisation as the duplicate-registration check: trimmed, collapsed
  spaces, case-insensitive). If no name match, but exactly one People record has
  that email — one *record*, not one name across several kinds (builder's call,
  the stricter reading, per the anti-goal) — **and** no other live RSVP at this
  event shares that email (builder's call: a household email used by two guests
  must not hand one guest's furbaby to the other) — use it. Otherwise no
  automatic match (initials). People is unique
  per (kind, email), so one person can have several records (Member, Volunteer,
  Partner, Sponsor): among matches prefer one that has a photo, then Member,
  then Volunteer, then the rest.
  Matching is computed when it's needed (registrations list, check-in), not
  stored, so a photo added to someone's People profile later is picked up
  automatically.
- **Changing it** (owner: "we still have an option to change it"):
  - The event's registrations list (`/admin/registrations/[eventId]`) gets a
    small round photo/initials thumbnail beside each name, so the team can see
    before the day who still shows initials.
  - The registration detail page gets a **Welcome photo** card showing what the
    door will show and where it came from ("From their RSVP", "From their People
    profile", "Initials"), with:
    - **Upload a photo** (resized in the browser like other photo uploads, then
      stored server-side as a small WebP like `person_photos`, ~480 px).
    - **Use the photo from their People profile** — only when a match exists;
      clears an RSVP-specific photo.
    - **Show initials instead** — forces no photo.
    - When uploading and the RSVP is matched to a People record, an unticked
      checkbox **"Also save this photo to their People profile"** (sets
      `people.photo_id` via the existing `savePersonPhoto`).
  - Every one of these goes through `ConfirmButton` with a dialog saying what
    will happen, logs to `activity_log` with a new label, and checks the
    capability before reading the registration (the action-safety test enforces
    this pattern).

## Non-goals

- Guests uploading their own furbaby photo during RSVP or on their pass page.
  (Owner chose manual. Easy to add later; don't build hooks for it now.)
- Photo cards for any outcome other than a successful check-in. Already checked
  in, unpaid, acknowledgement needed, wrong event, unknown code keep their current
  screens exactly.
- Multiple photos per RSVP, slideshows, or one photo per furbaby.
- A bulk "match everyone" screen or batch uploads.
- Showing these photos anywhere public, in emails, or in exports.

## Anti-goals (would be a failure even if it "works")

- Showing **another guest's** furbaby or name. A wrong automatic match is worse
  than initials — when in doubt, don't match.
- Making the door slower. The scan → card moment must feel instant; a slow photo
  must not delay the card (show initials/placeholder, swap in the photo when it
  loads, or have the image ready before the card opens — builder's choice).
- Breaking the no-database fallback or any existing check-in behaviour (counts,
  sounds, warnings, manual check-in).
- Making photos less private than today.

## Constraints

- **Privacy:** photos are personal and private, like Join photos and receipts.
  Served only to signed-in admins, `Cache-Control: private`, never a shared cache,
  never Vercel Blob (see AGENTS.md: small images live in Postgres tables).
- **Roles:** the door is often run by a **Check-in helper** (`checkin` role),
  which does **not** have `people:view`. So the check-in screen cannot use the
  existing `/people/photo/[id]` route. Add a photo route for check-in that allows
  `checkin` (and anyone with `registrations:view`) and only serves the photo for a
  registration of the event being checked in — it must not become a way for a
  check-in helper to browse every People photo. Setting/changing photos needs
  `registrations:edit`; "also save to People profile" additionally needs
  `people:edit`.
- **Database:** additive migration **035** (next free number). New table for
  RSVP photos (same shape as `person_photos`, keyed to the registration, cascade
  on delete), plus a nullable column on `registrations` recording the team's
  choice: automatic (NULL, default — existing rows unchanged), this RSVP's photo,
  or initials. Exact names are the builder's. Remember staging migrates the live
  database before `main` has the code.
- **Recently deleted** registrations: the 30-day purge cron must also remove the
  RSVP photo (cascade is fine if the purge deletes the row).
- Pure logic (matching choice, initials, which photo wins) goes in a `.mjs` file
  with tests beside it, per the repo convention. Initials: first letter of the
  first and last words of the name, upper-cased; one word → one letter; empty →
  a neutral fallback.
- Accessibility: the card stays a labelled modal dialog; the photo is decorative
  next to the visible name (empty alt is fine); initials circle needs sufficient
  contrast (gold on the dark fill, ≥ 4.5:1 for the letters or treat as large text
  ≥ 3:1 at that size).
- Copy follows the house voice; any new admin labels are plain and specific.
- Update `CLAUDE.md` (new feature bullet, migration 035) and `AGENTS.md`
  (migration table, next number 036).

## Left to the builder

- Exact table/column names, the route path, and how the photo URL reaches the
  scanner (e.g. returned by `checkInByCode` alongside `person`).
- How the photo loads quickly (preload vs. swap-in), as long as the card is never
  delayed.
- Thumbnail rendering on the registrations list (lazy loading, size).
- Whether to show the welcome-card preview in the event editor's Check-in
  experience section (nice to have, not required).
