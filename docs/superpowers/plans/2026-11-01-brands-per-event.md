# Brands per event — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sponsors & partners becomes a brand directory; each event gets a Brand tracker where brands are invited, written to, and their per-event reply and giving tracked; only brands that said Yes show publicly.

**Architecture:** New `event_brands` join table (event × brand) holds everything per event. Pure rules in `app/lib/eventBrands.mjs`, SQL in `app/lib/eventBrandsStore.js`, server actions in `app/admin/eventBrandActions.js`, page at `app/admin/(app)/events/[id]/brands/page.jsx`. Public readers merge Yes brands from `event_brands` with hand-typed names left in `events.partners` / `events.sponsors`, so existing components keep receiving the same `partners` / `sponsors` arrays.

**Tech Stack:** Next.js 16 app router, server actions, `pg` via `sql()` / `transaction()` in `app/lib/db.js`, `node --test` (`npm test`), migrations in `db/migrations` run at build.

**Spec:** `docs/superpowers/specs/2026-11-01-brands-per-event-design.md`

## Global Constraints

- Migrations additive only: no DROP, no column type changes, no rewriting existing rows except the backfill INSERTs.
- Staging first; never run migrations, seeds or test writes against production; push to main only when the owner says.
- Nothing is emailed except by an admin ticking recipients and pressing send.
- Reply values: `waiting` ("No reply yet"), `yes` ("Yes"), `no` ("No").
- Roles per event: `Partner`, `Sponsor` (same strings as `supporters.kind`).
- Golden Beginning event id: `2d974ade-c0f6-4a01-8540-9049010366cf`.
- Header button label: "Brands & partnerships"; page title: "Brand tracker".
- Permissions: view = `events:view` + `supporters:view`; edit rows = `supporters:edit`; send = `letters:edit`.
- Keep `CLAUDE.md` notes current; log tasks in `~/Claude/GigaOffice/office/LOG.md`.

## Review Focus

- The same brand invited twice to one event → second add is ignored ("already invited"), never a duplicate row.
- A directory brand removed (soft-deleted) while invited → its tracker row stays visible, marked "Removed from directory", never shown publicly.
- A brand says Yes but has no logo/blurb or the show switch is off → appears on the event page as a name (as today) but not on the home page.
- Sending to a ticked brand with no email → skipped and named in the result, as the send page does now.
- A hand-typed name in `events.partners` that matches a directory brand with reply `no` → not shown publicly.

---

### Task 1: Rules and migration

**Files:**
- Create: `app/lib/eventBrands.mjs`, `app/lib/eventBrands.test.mjs`, `db/migrations/077_event_brands.sql`

**Interfaces:**
- Produces:
  - `REPLIES = [["waiting","No reply yet"],["yes","Yes"],["no","No"]]`, `replyLabel(key)`
  - `cleanEventBrand(input) -> { value } | { error }` — fields: `role`, `reply`, `followUpOn` (YYYY-MM-DD or null), `gives` (keys from `GIVES` in `supporters.mjs`), `cashAmount`, `inKindValue` (whole pesos ≥0 or null), `inKindNote` ≤300, `boothNeeds` ≤500, `repsAttending`, `dogsAttending` (0–500 or null), `showAmounts` bool, `notes` ≤2000
  - `trackerReply(rsvpStatus) -> "yes"|"no"|"waiting"` (confirmed→yes, declined→no, else waiting)
  - `trackerCounts(rows) -> { invited, yes, no, waiting }`
  - `publicNames(arrayNames, yesNames, directoryNames) -> string[]` — Yes names first (in given order), then array names whose lowercase trimmed form is not in `directoryNames`; de-duplicated case-insensitively.

- [ ] **Step 1: Write failing tests** in `eventBrands.test.mjs`:
  - `cleanEventBrand({ role: "Sponsor", reply: "yes", cashAmount: "1,500" }).value` → `{ role: "Sponsor", reply: "yes", cashAmount: 1500, … }`; `role: "x"` → error /Partner or Sponsor/; `repsAttending: "2.5"` → error /whole numbers/; `followUpOn: "31/12"` → error /date/.
  - `trackerReply("confirmed") === "yes"`, `("declined") === "no"`, `("tentative") === "waiting"`, `(null) === "waiting"`.
  - `trackerCounts([{reply:"yes"},{reply:"no"},{reply:"waiting"},{reply:"yes"}])` → `{ invited: 4, yes: 2, no: 1, waiting: 1 }`.
  - `publicNames(["Novotel ", "Kuya's Cafe"], ["Vitality"], ["novotel","vitality"])` → `["Vitality","Kuya's Cafe"]`.
- [ ] **Step 2:** `npm test` → the new tests fail (module missing).
- [ ] **Step 3:** Implement `eventBrands.mjs`. Write `077_event_brands.sql`:
  - `event_brands` (`id uuid pk default gen_random_uuid()`, `event_id uuid not null references events(id) on delete cascade`, `supporter_id uuid not null references supporters(id)`, `role text not null check (role in ('Partner','Sponsor'))`, `reply text not null default 'waiting' check (reply in ('waiting','yes','no'))`, `follow_up_on date`, `gives text[] not null default '{}'`, `cash_amount integer check (>=0)`, `in_kind_value integer check (>=0)`, `in_kind_note text ≤300`, `booth_needs text ≤500`, `reps_attending smallint 0–500`, `dogs_attending smallint 0–500`, `show_amounts boolean not null default false`, `notes text ≤2000`, `replied_at timestamptz`, `added_by text`, `created_at`/`updated_at timestamptz not null default now()`, `unique (event_id, supporter_id)`), index on `supporter_id`.
  - `ALTER TABLE letter_sends ADD COLUMN IF NOT EXISTS event_id uuid` + index `(event_id, ref)`.
  - Backfill A (past lists): insert from `events` × `unnest(partners)` / `unnest(sponsors)` joined to `supporters` on `lower(trim(name))` (not deleted), role from which array, reply `yes`, `ON CONFLICT DO NOTHING`.
  - Backfill B (Brand Tracker → Golden Beginning): insert for supporters (not deleted) where any of `invite_status, rsvp_status, agreement_status, invited_on, follow_up_on, assigned_to, booth_needs, reps_attending, dogs_attending` is not null, into event `2d974ade-…`, role = `supporters.kind`, reply = confirmed→yes / declined→no / else waiting, copying follow_up_on, booth_needs, reps/dogs; notes = `concat_ws(' · ', 'Assigned to ' || assigned_to, 'Agreement: ' || agreement_status, 'Invite: ' || invite_status, 'Invited on ' || invited_on)`; only if that event exists; `ON CONFLICT (event_id, supporter_id) DO UPDATE` fills only null tracker fields (keeps reply `yes` from A).
  - At the end, `RAISE NOTICE` each array name with no directory match (a `DO $$ … $$` block), so the build log lists them.
- [ ] **Step 4:** `npm test` → all pass.
- [ ] **Step 5:** Commit "Brands per event: rules + event_brands migration with backfill".

### Task 2: Store

**Files:**
- Create: `app/lib/eventBrandsStore.js`
- Modify: `app/lib/letterSendsStore.js` (event-aware)

**Interfaces:**
- Consumes: Task 1 table and `cleanEventBrand`.
- Produces:
  - `trackerRows(eventId) -> rows` (event_brands joined with supporters: name, logo, kind, contact_name, contact_email, salutation, deleted_at; ordered reply waiting→yes→no, then name)
  - `inviteBrands(eventId, supporterIds, by) -> { added, already }` (role defaults to the brand's `kind`; ON CONFLICT DO NOTHING)
  - `saveTrackerRow(eventId, supporterId, value, by)`; sets `replied_at = now()` when reply changes to yes/no
  - `removeFromTracker(eventId, supporterId)`
  - `yesBrandsByEvent(eventIds) -> { eventId: [{ supporterId, name, role, logo, slug }] }` (supporter not deleted)
  - `brandHistory(supporterId) -> [{ eventId, title, date, role, reply, gives, cashAmount, inKindValue }]` newest first
  - `joinedCounts() -> { supporterId: n }` (Yes rows on published events)
  - `logSend({ …, eventId })`; `sendsFor(refs, { eventId })` filters `event_id = eventId` when given; `refreshSends` unchanged.

- [ ] **Step 1:** No unit tests (SQL only); verified through Task 3/5 pages on staging. Implement.
- [ ] **Step 2:** `npm test` and `npx next build` pass.
- [ ] **Step 3:** Commit "Brands per event: store".

### Task 3: Brand tracker page + header button

**Files:**
- Create: `app/admin/(app)/events/[id]/brands/page.jsx`, `app/admin/eventBrandActions.js`, `app/admin/(app)/events/[id]/brands/TrackerRow.jsx`
- Modify: `app/admin/(app)/events/[id]/page.jsx` (button), `app/admin/admin.css`, `app/lib/admin/guide.mjs` only if a test lists event subpages

**Interfaces:**
- Consumes: Task 2 store; `SendStatus` (`app/admin/(app)/SendStatus.jsx`); `refreshSends`/`sendsFor` with `{ eventId }`.
- Produces: route `/events/<id>/brands`; actions `inviteToEvent(data)` (fields `event`, `brand` multiple), `saveTrackerEntry(data)`, `removeTrackerEntry(data)`; all redirect back with `backWith`.

- [ ] **Step 1:** Header: add `<a className="btn ghost" href={`${base}/events/${event.id}/brands`}>Brands &amp; partnerships</a>` before RSVPs (shown when the admin can view supporters).
- [ ] **Step 2:** Page per the approved mockup: title "Brand tracker", lead with the event title and date; counts chips (`trackerCounts`); "+ Invite brands" (a `<details>` with a search box filtering a checkbox list of directory brands not yet invited, submit → `inviteToEvent`); a form whose table has tick boxes (`name="to" value="supporter:<id>"`), Brand (logo, name, "as Partner/Sponsor", "Removed from directory" when deleted), Contact (person + email or "No email yet"), Invite letter (`SendStatus` with event-filtered sends), Their reply (chip + follow-up date), Giving (kinds + amounts); each row expands (`<details>` "Edit") to a small form → `saveTrackerEntry` with role, reply, follow-up, gives checkboxes, cash, in-kind value + note, show amounts, booth needs, reps, dogs, notes, and a Remove button (`ConfirmButton`). Submit button "Send letter to ticked" posts to `/letters/send` with `event=<id>` (GET form, like the Guest list).
- [ ] **Step 3:** Actions check `supporters:edit`; `saveTrackerEntry` on first reply `yes` issues the brand's HOR number (move the numbering block from `saveSupporter` into a shared `issueSupporterNumber(tx, supporterId)` in `app/lib/supporterNumbers.js`, used by both) and refuses with "Give <brand> a 4-letter ID code first (on its brand page)" when the brand has no code; log `event.brand.invite|save|remove` via `logActivity`.
- [ ] **Step 4:** `npm test`, `npx next build` pass. Commit "Brand tracker page per event".

### Task 4: Letters from the tracker

**Files:**
- Modify: `app/admin/(app)/letters/send/page.jsx`, `app/admin/letterActions.js`

**Interfaces:**
- Consumes: Task 2 `logSend({ eventId })`.
- Produces: send page accepts `event=<uuid>`; shows "For: <event title>"; carries it as hidden `event`; prefills blank values whose label matches the event's name, date or venue (labels as used by migration 073's event fill-in; reuse that code); back link returns to the tracker.

- [ ] **Step 1:** Implement; `sendLetters` reads `event`, validates uuid + exists, passes `eventId` to `logSend`; after sending, redirect back to `/events/<id>/brands` with the result flash.
- [ ] **Step 2:** `npm test`, build pass. Commit "Letters can be sent from an event's Brand tracker".

### Task 5: Public readers

**Files:**
- Modify: `app/lib/publicEvents.js`, `app/lib/publicSupporters.js`, `app/lib/supporters.mjs` (`isPublic`), `app/api/supporters/route.js` (comment), `app/lib/supporters.test.mjs`

**Interfaces:**
- Consumes: `yesBrandsByEvent`, `publicNames`.
- Produces: published events expose `partners`/`sponsors` = `publicNames(array, yes names for that role, all directory names)`; `isPublic(row, { joined })` = `show_on_site && logo && blurb && joined > 0` (brand status no longer matters).

- [ ] **Step 1: Tests** in `supporters.test.mjs`: `isPublic({ show_on_site: true, logo: "x", blurb: "b" }, { joined: 0 }) === false`; with `{ joined: 1 }` → true; status no longer matters (`status: "inquiry"` with joined 1 → true).
- [ ] **Step 2:** Implement. `loadPublicSupporters` lists brands with show/logo/blurb and ≥1 Yes on a published event; each brand's `events` = its Yes events (published, newest first); `kind` shown = role at its latest Yes event; totals: sum of `cash_amount`/`in_kind_value` of Yes rows with `show_amounts` for the latest year that has any (feeds the existing `totals` shape). Event page: `supporterLinks` gets the merged names.
- [ ] **Step 3:** Before committing, query staging for brands that are public under the old rule but not the new one; put the list in the task report.
- [ ] **Step 4:** `npm test`, build pass. Commit "Public brands: only Yes brands show".

### Task 6: Directory and Guest list

**Files:**
- Modify: `app/admin/(app)/supporters/SupporterForm.jsx`, `app/admin/(app)/supporters/page.jsx`, `app/admin/(app)/supporters/[id]/page.jsx`, `app/admin/supporterActions.js`, `app/admin/(app)/guests/page.jsx`

- [ ] **Step 1:** Form: hide Status, Tier, support year, amounts and their agreement block the same way Outreach is hidden (a `SHOW_*` constant), and make `saveSupporter` skip those columns when the form doesn't send them (as done for outreach), so saved values stay. Website switch hint: "Shows on the home page once they've said Yes to an event; needs a logo and a blurb."
- [ ] **Step 2:** List: remove status/tier filters and the Status/Support columns; add "Joined" (`joinedCounts`, "—" when 0). Keep kind as "Usually: Partner/Sponsor".
- [ ] **Step 3:** Brand page: an "Events" card from `brandHistory` (event title linking to its tracker, date, role, reply chip, giving).
- [ ] **Step 4:** Guest list: drop the supporter rows from the Sponsors/Partners groups (contacts in those categories stay); add a note under those groups: "Brands are invited from each event's Brand tracker (Events → an event → Brands & partnerships)."
- [ ] **Step 5:** `npm test`, build pass. Commit "Sponsors & partners is a brand directory".

### Task 7: Wrap-up

- [ ] **Step 1:** Update `CLAUDE.md` (one bullet: tables, pages, public rule, backfill).
- [ ] **Step 2:** Push to staging; confirm build log "Applied: 077_event_brands.sql" and the unmatched-name notices; open the tracker on staging if possible (needs owner sign-in, otherwise say so).
- [ ] **Step 3:** Report to the owner: what changed, the brands that would disappear from the home page, unmatched names, what wasn't checked. Log in `LOG.md`. Do not push to main until asked.
