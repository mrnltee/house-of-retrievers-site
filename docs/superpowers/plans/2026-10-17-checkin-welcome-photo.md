# Check-in Welcome Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A successful door scan shows a welcome card — the guest's furbaby photo (or initials), "Welcome to {event}", their name, "with {furbaby}" and a customizable message — with photos matched from People automatically and changeable per RSVP.

**Architecture:** Pure decisions (match, which photo wins, initials, message line) live in `app/lib/welcomePhoto.mjs` with tests. A server helper `app/lib/welcomePhotos.js` loads People candidates and stores RSVP photos (migration 035). One admin route serves the resolved photo for a registration to check-in helpers and registration viewers; the Scanner, the registrations list and the registration page all use it.

**Tech Stack:** Next.js 16 App Router (plain JSX), React 19, Postgres via `pg` (`app/lib/db.js`), `sharp` for the 480 px WebP copy, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-17-checkin-welcome-photo-design.md`

## Global Constraints

- Work on `staging`; additive migration `035_registration_welcome_photos.sql` only (shared live database). NULL/absent = today's behaviour.
- Photos are private: served only to signed-in admins, `Cache-Control: private`, never Blob, never public, never emailed.
- Check-in helpers (`checkin` role) lack `people:view`; the photo route must allow `checkin` **or** `registrations:view`, and only for a registration of the event in the URL.
- Changing a photo needs `registrations:edit`; "Also save to their People profile" additionally needs `people:edit`.
- Every admin submit goes through `ConfirmButton`; every action calls `actionAdmin(...)` before `registration(...)`, logs with label `registration.photo` ("Changed a welcome photo").
- Default message text, verbatim: `Welcome in. Have a wonderful time together.`
- Card copy, verbatim: eyebrow `Welcome to`, then event title, then guest name, then `with {furbaby}`, then the message line, then button `Ready for the next guest`.
- Matching: email **and** normalised name (trim, collapse spaces, case-insensitive) → match. Else, exactly one People *record* with that email **and** no other live RSVP at this event shares that email → match. Else none. Among matches prefer: has photo, then kind `Member`, then `Volunteer`, then the rest.
- Keep `prefers-reduced-motion`, the existing card colours/border/animation, sounds, counts and all non-success outcomes unchanged.
- Update `CLAUDE.md` (feature bullet, migration 035) and `AGENTS.md` (migration table row 035, next number `036`).

## Review Focus

1. **Shared family email** — Ana (in People with a photo) and Ben both RSVP with the same email: Ben must get initials, not Ana's furbaby. → Task 1 test `shared email at this event blocks the email-only match`.
2. **RSVP photo set, then its row is gone** (`welcome_photo = 'own'` but `welcome_photo_id` NULL): fall back to the People match, then initials — never a broken image. → Task 1 test `own choice without a photo falls back`.
3. **Names typed differently** ("  ana   REYES ") still match "Ana Reyes". → Task 1 test `name match ignores case and spacing`.
4. **Odd names** (one word, empty, leading spaces, non-Latin) give sensible initials. → Task 1 test `initials`.
5. **A check-in helper scans** and the photo loads (no `people:view`), while someone with no relevant role is refused. → Task 1 test `who may see welcome photos`, and Task 3 manual check.

---

### Task 1: Pure welcome-photo rules

**Files:**
- Create: `app/lib/welcomePhoto.mjs`
- Test: `app/lib/welcomePhoto.test.mjs`

**Interfaces:**
- Produces:
  - `DEFAULT_WELCOME_MESSAGE` — the default text above.
  - `initialsFor(name: string) -> string` — first letter of first and last word, upper-cased; one word → one letter; empty → `"?"`.
  - `pickPeopleMatch({ name, email }, candidates: {id, kind, name, email, photo_id}[], { sharedEmail = false } = {}) -> candidate | null` — the matching rule in Global Constraints; `sharedEmail` = another live RSVP at this event has the same email.
  - `pickWelcomePhoto({ choice, ownPhotoId, match }) -> { source: "own" | "people" | "initials", photoId: string | null }` — `choice` is `registrations.welcome_photo` (`null` auto, `"own"`, `"initials"`). `"own"` with a photo → own; `"initials"` → initials; otherwise a match with `photo_id` → people; else initials.
  - `welcomeMessageLine(message: string | null | undefined) -> string` — `null`/`undefined` → default; `""` or whitespace → `""`; otherwise trimmed text.
  - `canSeeWelcomePhoto(roles: string[]) -> boolean` — `can(roles, "checkin") || can(roles, "registrations:view")` (import `can` from `./admin/roles.mjs`).
  - `WELCOME_PHOTO_SOURCE_LABELS = { own: "From their RSVP", people: "From their People profile", initials: "Initials" }`.

- [ ] **Step 1: Write the failing tests** in `app/lib/welcomePhoto.test.mjs`:
  - `initials`: `"Ana Reyes"→"AR"`, `"  maria  de la cruz "→"MC"`, `"Cher"→"C"`, `""→"?"`, `"Ñora Ünal"→"ÑÜ"`.
  - `name match ignores case and spacing`: candidate `{name:"Ana Reyes", email:"ana@x.test"}` matches `{name:"  ana   REYES ", email:"ANA@x.test"}`.
  - `email-only match needs exactly one record`: one candidate named "Ana Reyes" matches RSVP "A. Reyes" (same email); two candidates (Member "Ana Reyes", Volunteer "Ben Reyes") for RSVP "A. Reyes" → `null`.
  - `shared email at this event blocks the email-only match`: one candidate "Ana Reyes"; RSVP "Ben Reyes" same email with `{ sharedEmail: true }` → `null`; RSVP "Ana Reyes" with `{ sharedEmail: true }` → still matches (name match).
  - `match preference`: name-matching Member without photo vs Volunteer with photo → Volunteer; both with photos → Member.
  - `own choice without a photo falls back`: `{choice:"own", ownPhotoId:null, match:{photo_id:"p1"}}` → `{source:"people", photoId:"p1"}`; same with `match:null` → initials; `{choice:"own", ownPhotoId:"r1"}` → own; `{choice:"initials", match:{photo_id:"p1"}}` → initials.
  - `message line`: `null`→default, `""`→`""`, `"  Hi  "`→`"Hi"`.
  - `who may see welcome photos`: `["checkin"]`→true, `["treasurer"]`→true, `["content"]`→false, `[]`→false.

- [ ] **Step 2: Run** `node --test app/lib/welcomePhoto.test.mjs` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** the exports above in `app/lib/welcomePhoto.mjs` (reuse the normaliser from `app/lib/registrationRecovery.mjs` by exporting it there as `normalizedIdentity` rather than copying it).

- [ ] **Step 4: Run** `npm test` — Expected: all pass (142 + new).

- [ ] **Step 5: Commit** `Check-in: welcome photo rules` (both files + `registrationRecovery.mjs`).

### Task 2: Storage and server helper

**Files:**
- Create: `db/migrations/035_registration_welcome_photos.sql`
- Create: `app/lib/welcomePhotos.js`
- Modify: `app/lib/personPhotos.js` (extract the resize)

**Interfaces:**
- Consumes: Task 1 `pickPeopleMatch`, `pickWelcomePhoto`, `initialsFor`.
- Produces:
  - Table `registration_photos (id uuid pk default gen_random_uuid(), registration_id uuid not null references registrations(id) on delete cascade, mime text not null check (mime in ('image/jpeg','image/png','image/webp')), data bytea not null, bytes integer not null, uploaded_by text, created_at timestamptz not null default now())` + index on `(registration_id, created_at desc)`.
  - `registrations.welcome_photo text check (welcome_photo in ('own','initials'))` (NULL = automatic) and `registrations.welcome_photo_id uuid references registration_photos(id) on delete set null`.
  - `shrinkPhoto(dataUrl) -> Promise<{ mime, bytes: Buffer } | null>` exported from `personPhotos.js`; `savePersonPhoto` uses it (behaviour unchanged).
  - `welcomePhotosFor(registrations: {id, event_id, name, email, welcome_photo, welcome_photo_id}[]) -> Promise<Map<regId, { source, photoId, personId, initials, version }>>` — one People query (`lower(email) = ANY($1)`), `sharedEmail` computed from the given rows of the same event; `version` = `${source}-${photoId || "none"}` for cache-busting; `personId` = the People match's id (or `null`) even when another source wins, so the admin page knows a match exists.
  - `welcomePhotoFor(registrationId, eventId) -> Promise<{ ...same } | null>` — loads the registration (not deleted) plus the event's other live registrations sharing its email, then calls `welcomePhotosFor`.
  - `photoBytesFor(resolved) -> Promise<{ mime, data } | null>` — reads `registration_photos` for `own`, `person_photos` for `people`.
  - `saveRegistrationPhoto(registrationId, dataUrl, who) -> Promise<string | null>` — `shrinkPhoto`, insert, then `UPDATE registrations SET welcome_photo='own', welcome_photo_id=$id`.

- [ ] **Step 1: Write the migration** with a header comment saying NULL keeps today's behaviour; comment the two columns.
- [ ] **Step 2: Extract `shrinkPhoto`** from `savePersonPhoto` (same 480 px WebP, quality 78, `RAW_LIMIT` fallback).
- [ ] **Step 3: Implement `app/lib/welcomePhotos.js`** with the four functions above. "Live" RSVP for `sharedEmail` = same event, `deleted_at IS NULL`, `status <> 'cancelled'`, different id, same `lower(email)`.
- [ ] **Step 4: Run** `npm test && npm run build` — Expected: pass (no `DATABASE_URL`: migrations skipped).
- [ ] **Step 5: Commit** `Check-in: store welcome photos per RSVP (migration 035)`.

### Task 3: Photo route and the welcome card at the door

**Files:**
- Create: `app/admin/(app)/checkin/photo/[eventId]/[registrationId]/route.js`
- Modify: `app/admin/actions.js` (`checkInByCode`, check-in save block in `saveEvent`)
- Modify: `app/admin/(app)/checkin/[eventId]/page.jsx`, `app/admin/(app)/checkin/[eventId]/Scanner.jsx`, `app/admin/admin.css`
- Modify: `app/admin/(app)/events/EventFields.jsx` (`CheckinSettings`)

**Interfaces:**
- Consumes: Task 1 `canSeeWelcomePhoto`, `welcomeMessageLine`, `DEFAULT_WELCOME_MESSAGE`; Task 2 `welcomePhotoFor`, `photoBytesFor`.
- Produces: route `GET {base}/checkin/photo/{eventId}/{registrationId}?v={version}`; `checkInByCode` result `person` gains `id`, `initials`, `photo: { source, version }`.

- [ ] **Step 1: Route.** `currentAdmin()`; 403 unless `canSeeWelcomePhoto(admin.roles)`; 404 on bad UUIDs, unknown/deleted registration, wrong event, or `source === "initials"`; else bytes with `Content-Type`, `Cache-Control: private, max-age=86400` (the `?v=` changes when the photo changes), `X-Content-Type-Options: nosniff`.
- [ ] **Step 2: `checkInByCode`.** After computing `person`, when `outcome === "ok"` add `id`, `initials: initialsFor(reg.name)` and `photo` from `welcomePhotoFor(reg.id, eventId)` (`{ source, version }` only). Select `r.email` too. Other outcomes unchanged.
- [ ] **Step 3: Page.** Pass `base={await adminBase()}` and `successMessage` raw (`null` stays `null`) to `Scanner`; stop passing `successTitle`.
- [ ] **Step 4: Scanner card.** Replace the success card body: a 128 px gold-ringed circle showing `initials` with the photo `<img>` layered on top (alt `""`, revealed `onLoad`, hidden `onError`) so the card never waits for the photo; tag `Welcome to`; event title as the `h2` (keep `id="checkin-success-title"`); name; `with {furbaby}` when present; `welcomeMessageLine(successMessage)` when non-empty, clamped to two lines; the existing button. Add `.checkin-welcome-*` styles to `admin.css` (ring `#AD8330`-equivalent `var(--a-gold)`, initials fill dark warm, letters ≥ 3:1 at that size).
- [ ] **Step 5: Editor + save.** In `CheckinSettings`: remove the Success title input; message label `Message under the guest's name` with hint `Optional. Leave empty to show no message.`, `defaultValue={message ?? DEFAULT_WELCOME_MESSAGE}`; intro copy: `After a successful scan, the door screen welcomes the guest by name, with their furbaby's photo or their initials, and plays the selected sound. Failed scans keep the standard warning tone.` In `saveEvent`: message = trimmed, sliced to 300, **no default fallback** (blank saves `''`); title only updated when `data.has("checkinSuccessTitle")` (`COALESCE($n, checkin_success_title)`), so saved titles aren't wiped.
- [ ] **Step 6: Run** `npm test && npm run build` — Expected: pass.
- [ ] **Step 7: Manual check** (local Postgres per AGENTS.md §8 if Docker/Postgres is available; otherwise on the staging preview with a throwaway event and registrations, deleted afterwards): scan as Owner and as a `checkin`-only admin → photo shows; no photo → initials; empty message → no line; phone (390 px) and laptop widths; reduced motion; keyboard focus lands on the card button.
- [ ] **Step 8: Commit** `Check-in: welcome card with furbaby photo or initials`.

### Task 4: Changing the photo from the registrations pages

**Files:**
- Create: `app/admin/(app)/registrations/WelcomeAvatar.jsx`, `app/admin/(app)/registrations/WelcomePhotoField.jsx`
- Modify: `app/admin/registrationActions.js` (three actions, appended at the end of the file)
- Modify: `app/admin/(app)/registrations/[eventId]/page.jsx`, `app/admin/(app)/registrations/[eventId]/r/[regId]/page.jsx`
- Modify: `app/lib/admin/activity.mjs`, `app/lib/admin/actionSafety.test.mjs`

**Interfaces:**
- Consumes: Task 2 `welcomePhotosFor`, `welcomePhotoFor`, `saveRegistrationPhoto`; `savePersonPhoto`; Task 1 `WELCOME_PHOTO_SOURCE_LABELS`.
- Produces:
  - `WelcomeAvatar({ base, eventId, registrationId, resolved, size = 36 })` — server component: `<img loading="lazy">` from the Task 3 route, or initials span (reuse `.person-avatar` / `.is-empty` styles).
  - Actions (each `actionAdmin("registrations:edit")` before `registration(...)`, `ConfirmButton`-only, log `registration.photo`, `backWith(pagePath(reg), …)`):
    - `uploadWelcomePhoto(data)` — fields `id`, `photoData`, optional `saveToPerson=on`. Saves via `saveRegistrationPhoto`; if ticked and `can(admin.roles, "people:edit")` and the server-resolved match has a `personId`, also `savePersonPhoto(personId, photoData)`. Never trust a person id from the form.
    - `useProfileWelcomePhoto(data)` — sets `welcome_photo = NULL` (automatic).
    - `useInitialsWelcomePhoto(data)` — sets `welcome_photo = 'initials'`.

- [ ] **Step 1: Failing test.** Add to `actionSafety.test.mjs`: `welcome photo actions authorize before reading a registration` — for `uploadWelcomePhoto`, `useProfileWelcomePhoto`, `useInitialsWelcomePhoto`, `actionAdmin(` appears before `registration(` in each body. Add `"registration.photo": "Changed a welcome photo"` to `ACTION_LABELS`.
- [ ] **Step 2: Run** `node --test app/lib/admin/actionSafety.test.mjs` — Expected: FAIL.
- [ ] **Step 3: Implement the three actions.**
- [ ] **Step 4: `WelcomePhotoField`** (client, modelled on `app/admin/(app)/people/PersonPhotoField.jsx`: same browser resize to 960 px JPEG, round preview, Cancel). Props `{ registrationId, name, source, hasMatch, canSaveToPerson }`. Shows `Upload a photo` / `Change photo`; with a preview: the `Also save this photo to their People profile` checkbox (unticked; only when `hasMatch && canSaveToPerson`) and `Save photo` ConfirmButton (items: the door shows this photo for this RSVP; private to admins; plus "Their People profile photo is replaced" when ticked). Separate forms: `Use the photo from their People profile` (only when `hasMatch` and `source !== "people"`) and `Show initials instead` (only when `source !== "initials"`), each with a ConfirmButton.
- [ ] **Step 5: Registration page.** New card **Welcome photo** above "Edit registration": `WelcomeAvatar` at 96 px, `WELCOME_PHOTO_SOURCE_LABELS[source]`, and `WelcomePhotoField` when `can(admin.roles, "registrations:edit")`.
- [ ] **Step 6: Registrations list.** One `welcomePhotosFor(current)` call; `WelcomeAvatar` (36 px) before each name.
- [ ] **Step 7: Run** `npm test && npm run build` — Expected: pass.
- [ ] **Step 8: Manual check** on the same throwaway data: upload → door shows it; "Use People photo" and "Show initials" switch correctly; tick "also save" → People profile photo updates; list thumbnails match; a `checkin`-only admin can't reach these buttons.
- [ ] **Step 9: Commit** `Registrations: set or change a guest's welcome photo`.

### Task 5: Docs and release

**Files:**
- Modify: `CLAUDE.md`, `AGENTS.md`

- [ ] **Step 1:** Add a CLAUDE.md bullet **Check-in welcome card (17 Oct 2026)** after "Check-in feedback": the card, photo order, matching rule (incl. shared-email guard), the customizable message (NULL → default, `''` → none), the route and roles, the three admin actions, `app/lib/welcomePhoto.mjs` / `app/lib/welcomePhotos.js`, migration 035. Edit the "Check-in feedback" bullet: success title is no longer shown. AGENTS.md: table row `| 035 | per-RSVP welcome photos (registration_photos) and the photo choice on registrations |`, next number `036`.
- [ ] **Step 2: Run** `npm test && npm run build` — Expected: pass.
- [ ] **Step 3: Commit** `Docs: check-in welcome card` and push `staging`. Confirm the staging deployment is READY and its log shows `Applied: 035_registration_welcome_photos.sql`; run the Task 3/4 manual checks there if not done locally; delete throwaway records.
- [ ] **Step 4: Release** (owner already said to push to main once everything works): `git checkout main && git pull --ff-only origin main && git merge --ff-only staging && git push origin main && git checkout staging`; confirm the production deployment is READY.
