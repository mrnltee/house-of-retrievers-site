# AGENTS.md — handoff for Codex (and any other coding agent)

You are continuing work that Claude Code and Codex did on this repo through 13 Oct 2026.
Read this file fully before you change anything. Then read `CLAUDE.md` in full.

- **AGENTS.md** (this file) is *how to work here*: workflow, safety rules,
  conventions, the file map, what's open.
- **CLAUDE.md** is *what the product does*: the feature-by-feature spec, with
  the exact rules (prices, payments, numbering, emails, events, Instagram token,
  media). It is shared with Claude Code, so both agents work from the same
  spec. When the two disagree, CLAUDE.md wins on product behavior and this file
  wins on workflow. Then fix whichever one is out of date.

The repo is **public** (`github.com/mrnltee/house-of-retrievers-site`). Never
commit secrets, personal data, private IDs, or anything from `.env.local`.

---

## 1. What this is

House of Retrievers (HOR) is a small, SEC-registered Philippine nonprofit
("The House of Retrievers Society Inc.") of Golden Retriever and Labrador
families who do charity events, outreach and volunteering. You do **not** need
a dog to join or volunteer. The site's main job is getting people to **join**
(member, volunteer, partner, sponsor). The second job is **events**: listing them,
taking RSVPs and payments, and checking people in at the door.

| Host | What it serves | Code |
| --- | --- | --- |
| `www.houseofretrieversph.org` (apex redirects) | Main one-page site | `app/page.jsx`, `app/components/` |
| `events.houseofretrieversph.org` | Events list, event pages, passes | `app/events/`, rewritten by `proxy.js` → `app/lib/eventsHost.mjs` |
| `admin.houseofretrieversph.org` | Admin module (Google sign-in) | `app/admin/`, routed by `app/lib/adminHost.mjs` |
| `countdown.houseofretrieversph.org` | Retired pre-launch hostname; permanently redirects to www until the owner removes the Vercel domain | `app/lib/hostRouting.mjs` |

On localhost and Vercel previews the subdomains are paths instead: `/events`,
`/admin`.

The owner is a UI/UX designer. Features are usually designed in Figma first,
then built. Plain, warm language matters as much as the code (see §7).

## 2. Workflow rules (non-negotiable)

1. **Every change goes to the `staging` branch first.** Work on `staging`
   (or a short-lived branch merged into it). Push `staging` to GitHub. Vercel
   builds a preview for it.
2. **Push to `main` only when the owner says so** ("push to main", "once done
   push to main"). `main` is production and auto-deploys. Fast-forward only:
   ```bash
   git checkout main && git pull --ff-only origin main
   git merge --ff-only staging && git push origin main
   git checkout staging
   ```
   If the fast-forward fails, stop and ask. Don't rebase, force-push or rewrite
   history on `main` or `staging`.
3. **Staging and production share one Neon Postgres database.** A staging
   build runs new migrations against the *live* data before `main` has the code
   that uses them. So:
   - Migrations must be **additive and backward compatible**: new columns
     nullable or defaulted, widen CHECKs rather than narrow them, no drops or
     renames of anything the live code still reads.
   - Never edit or rename a migration that has been applied. Add the next
     number (the next one is **`041_…sql`**).
   - On staging use **throwaway records only**, and delete them afterwards.
     No test Join submissions on staging or production (they go to HOR's real
     Google Sheet).
4. **Email is live** (Resend, `hello@houseofretrieversph.org`). Only send an
   email the owner asked for. When testing locally, blank the email env vars
   (see §8).
5. After pushing to `main`, check that the production deployment reached
   READY on Vercel (dashboard or `npx vercel ls`). Check that the build log shows
   any new migration applied. If no production deployment was created for the
   commit, redeploy from the dashboard. Don't push an empty commit without asking.
6. **Commits:** one feature per commit. Subject `Area: what changed in plain
   words`, e.g. `Events: compact event cards`, `Event payments: ticket, pay
   and upload proof, admin check, QR pass on approval`. Run `git log
   --oneline` for more.
7. **Definition of done** (every change):
   - `npm test` passes (Node's built-in runner; about 123 tests in `app/lib/**/*.test.mjs`).
   - `npm run build` passes.
   - You looked at the change in a browser at desktop and at phone width
     (about 390 px), with keyboard only, and with reduced motion on where
     motion is involved.
   - New pure logic lives in a `.mjs` file with tests next to it.
   - **CLAUDE.md is updated.** Add or edit the feature's bullet in the same
     style: what it does, where the code lives, the rule that matters, the
     migration number. Update this file too if the change affects workflow,
     conventions or open items.
   - You pushed to `staging` and told the owner what changed and how to try it.

## 3. Security and privacy rules

- Secrets live only in Vercel env vars (owner-managed). Never print, log,
  commit or `NEXT_PUBLIC_` them. Don't ask the owner to paste keys in chat.
  They add keys in Vercel themselves.
- `.env.local` on the owner's Mac holds **production** values (pulled from
  Vercel), including the production `DATABASE_URL` and the live Resend key.
  `next dev` loads it automatically. Never run migrations, seeds or test writes
  against it (see §8 for the safe local recipe).
- Don't create accounts, enter passwords, or complete payments for the owner.
  Don't change Vercel, Google, Resend, Neon or Cloudinary settings without
  being asked.
- Admin roles are **re-read from the database on every page and action**
  (`app/lib/admin/guard.js`). Never trust roles from the session cookie or a
  form field.
- Payment details (GCash, Maya, GoTyme, QR Ph, bank) change only through
  `payment_change_requests`, approved by a *different* Owner after a sign-in
  within 10 minutes. Don't add shortcuts around this.
- Personal photos (Join furbaby photos, payment receipts, profile photos) are
  private. They are served only to admins with a private cache. Never make them
  public.
- HOR has no privacy notice yet (PH Data Privacy Act 2012 applies). Collect
  only what an event needs. Flag privacy questions to the owner. Don't guess,
  and don't write legal text as if it were approved.
- Volunteers under 18 come with a guardian. Never credit minors by name.

## 4. Stack

- Next.js 16 App Router, React 19, **plain JSX/JS, no TypeScript** (ask the
  owner before introducing it). Pure logic in `.mjs` with JSDoc.
- Vercel (Next.js server app, not a static export). Daily cron in `vercel.json`.
- Neon Postgres via `pg` (`app/lib/db.js`: `sql`, `transaction`,
  `hasDatabase`). DATE columns come back as `YYYY-MM-DD` strings on purpose.
- next-auth v4 (Google only, JWT). Resend for email. Cloudinary (free plan) for
  event albums. Vercel Blob only for the Instagram token. `qrcode` and `jsqr`
  for passes and check-in. `lucide-react` icons.
- Migrations `db/migrations/NNN_name.sql` are applied by `npm run build`
  (`scripts/migrate.mjs --if-configured`) or `npm run db:migrate`. Each file
  runs once, in a transaction, under advisory lock 727001, and is recorded in
  `schema_migrations`.

## 5. File map

```
proxy.js                 host routing: events / admin / retired-host redirect
app/page.jsx             main site composition
app/components/          public UI: Header, Hero, PurposeStories, Journey, InstagramFeed, Pack,
                         Supporters, FinalCta, JoinModal, SupportModal, Footer, FooterLegal,
                         LogoMoments, EventsView (cards, event page, RSVP countdown), RsvpModal,
                         PayStep, ShareMenu, BackgroundVideo, ScrollProgress, BrandTransition
app/content/             editable copy/data: activities, families, join, journey, events (fallback)
app/events/              events home, [slug] event page, r/[code] pass page (+ PassPayment)
app/api/                 join, rsvp (+ rsvp/proof), pass-qr/[code], event-image/[id], supporters,
                         support-details, legal, instagram, cron/refresh-instagram-token, auth
app/admin/               server actions: actions.js (events, people, membership, check-in),
                         registrationActions.js, emailActions.js, supporterActions.js,
                         eventTools.js (place search, photo upload, Gemini), eventPhotos.js (albums)
app/admin/(app)/         admin pages: events, registrations, checkin, people, supporters,
                         payments, emails, admins; ConfirmButton.jsx, ui.jsx, AdminNav.jsx
app/lib/                 shared logic (.mjs = pure + tested): prices, eventPayments, ticketCounts,
                         rsvpOpens, eventTime, calendar, share, emailTemplates, supporters,
                         cloudinary, spamGuard, siteSeo, logoMoments(+Rig), eventsHost, adminHost…
app/lib/admin/           roles, guard, auth, events (validate/toPublicEvent/publicStatus),
                         people, peopleImport, registrations, payments, activity (labels), log
app/globals.css          public styles and brand tokens;  app/admin/admin.css  admin styles
db/migrations/           001–033 (see §6)
scripts/                 migrate.mjs, apps-script/Code.gs (Join → Google Sheet), logo/ (rig builder)
brand/                   source logo SVGs (see brand/README.md)
public/                  web-ready media only (camera originals are git-ignored)
```

## 6. Data model (by migration)

| # | Adds |
| --- | --- |
| 001 | admins, events, registrations, payment methods + change requests, activity_log |
| 002–003 | `event_images` (stored in Postgres, served by `/api/event-image/[id]`), image source/crop |
| 004–005 | charity/beneficiary, purpose, hashtags; slug redirects (old event links forward) |
| 006 | `event_photos` (Cloudinary albums; source admin/participant, status approved/pending/rejected) |
| 007–009 | price tiers, gallery (up to 3 more photos), fit/fill/tile per picture, venue address, "What's included" |
| 010–012 | `people` (one per kind+email), `person_photos`, membership and member numbers by year |
| 013 | all-day events, event partners/sponsors names |
| 014 | `supporters` (sponsor/partner records, tiers, logos, contributions) |
| 015–016 | `email_templates` (saved wording for built-ins), `custom_email_templates`, `events.email_template_id` |
| 017 | volunteer numbers (HORV-YY-NNNN), supporter `code` + numbered IDs |
| 018 | event payments: fee_status `not_due/waiting/review/rejected/paid`, ticket + proof columns, `payment_proofs`, GoTyme |
| 019 | `events.rsvp_opens_at` (scheduled RSVP opening) |
| 020 | shared event emails with an exact-identity guard/admin override; 30-day recoverable registration deletion (`deleted_at`, actor and previous status) |
| 021 | event pricing basis (`registration/human/furbaby/bundle`); registration people/furbaby counts and calculated amount due |
| 022 | optional human + dog companion pricing: included furbabies per person and an additional furbaby fee |
| 023 | optional event-specific on-site payment notice |
| 024 | seasonal-theme settings table (the public seasonal treatment is parked; keep this applied migration) |
| 025 | supporter four-letter IDs (legacy three-letter IDs remain valid) and optional relationship labels |
| 026 | ticket-specific attendance pricing (`human_only` or `furbaby_package`) in existing tier JSON |
| 027 | event RSVP label/closed state, plus private optional vaccination-record photos |
| 028 | ten-minute expiry for unpaid RSVP holds |
| 029–030 | configurable participant form order and event acknowledgement records |
| 031–032 | private check-in success/failure feedback settings and sound presets/uploads |
| 033 | separate event capacity basis (`registration`, `human`, `furbaby`), defaulting to one slot per registration |
| 034 | per-event payment hold length (`events.payment_hold_minutes`); NULL inherits the 24-hour default, 0 is no limit |
| 035 | per-RSVP check-in welcome photos (`registration_photos`) and the photo choice on `registrations` |
| 036 | who checked someone in and how (`checked_in_by`, `checked_in_source` scan/manual) |
| 037 | per-event attendee limits: most furbabies per registration, most people per furbaby |
| 038 | furbaby breeds on registrations (`furbaby_breeds` text[]) |
| 039 | furbaby breeds on People from the Join form (`people.furbaby_breeds`) |
| 040 | HOR's own uploaded breed icons (`breed_icons`) |

Advisory locks in use: 727001 migrations, 727010 member numbers, 727011
supporter numbers. Pick a new number for any new lock.

## 7. Conventions to keep everything consistent

**Code**
- Keep the **no-database fallback**. Without `DATABASE_URL` the public site
  must still work: events come from `app/content/events.js`, RSVPs are off, and
  Support shows its preview.
- Time is **Asia/Manila** everywhere. Use the helpers in `app/lib/rsvpOpens.mjs`
  (`manilaInstant`, `manilaParts`, `formatOpens`) and `app/lib/eventTime.mjs`
  (`hasEnded`). Don't use the server's local time.
- Events pages are cached for 5 minutes (ISR). Anything time-based that has to
  flip exactly on time (RSVP opening) is flipped **in the browser**
  (`useLiveEvent` in `EventsView.jsx`). Enforce it again on the server
  (`/api/rsvp` refuses early sign-ups and ended or sold-out tiers).
- Things that can run out (the last slot, first-N ticket tiers) are checked
  **under the event row lock** in `/api/rsvp`. Ticket counts come from
  `app/lib/ticketCounts.mjs`. Never count in the browser.
- Capacity and pricing are separate decisions. `app/lib/eventCapacity.mjs` is
  the source for how many venue slots a registration consumes;
  `app/lib/registrationPricing.mjs` is the source for how much it costs.
  Existing events default to one slot per registration. Any public/admin
  capacity count, waitlist move, restore or attendee-count edit must use the
  capacity basis under the event lock.
- **Admin server actions**: one per button, using `formAction` (the clicked
  button's name/value isn't reliably sent). Check the capability first
  (`actionAdmin("registrations:fees")` etc.), before reading the target record.
  Redirect back with a flash message (`backWith`). Log every change to
  `activity_log` and add its label to `app/lib/admin/activity.mjs`.
- **Every admin button that changes something** goes through
  `app/admin/(app)/ConfirmButton.jsx`. It validates the form, then opens a dialog
  saying exactly what will happen (`items`, `echo` fields, `note`), then submits
  through the same button. Use `ConfirmSave` / `ConfirmMembership` for those
  forms; the event album's existing inline Remove → Yes, remove step is also a
  confirmation. `app/lib/admin/actionSafety.test.mjs` fails if a native admin
  submit button has no declared confirmation path. No one-click changes.
- New permissions go in `app/lib/admin/roles.mjs`. Roles are owner, events
  (Events lead), treasurer, content, checkin.
- **Event page layout uses container queries** on `.event-detail-wrap`, not
  screen media queries, so the editor's Preview can show the real phone layout.
  Keep new event-page rules as container queries.
- **Photos never go to Vercel Blob.** If Blob passes its Hobby limits, access
  is cut for 30 days, and the Instagram token lives there. Small images go in
  Postgres tables, albums go to Cloudinary, and Join photos go to Drive.
- **Emails** go through `sendEmail` in `app/lib/email.js` with an
  `idempotencyKey`. Templates are in `app/lib/emailTemplates.mjs`: HTML and plain
  text, one fixed frame. Variables are filled after escaping. Unknown variables
  are refused on save.
- The Join form ↔ Apps Script field names are a contract (`submission`,
  `joinType`, `socialProfile`, `socialUrl`, `furbabyName`, `furbabyBreed`). Change both sides
  together.
- Links from the events/admin hosts back to the main site are absolute
  (`HOME_URL`). The main header links to `EVENTS_URL`.
- Video: H.264 only (never HEVC), `+faststart`, no audio. The poster is the
  video's first frame. Keep photos near their rendered size.

**Brand** (full rules in CLAUDE.md, "Non-negotiable brand constraints")
- Never redraw or replace the two-dog logomark. The icon goes left and the
  wordmark right. Use the reverse art on dark surfaces. The Golden stays brand
  gold.
- Palette: near-black `#0D0D0D`, retriever gold `#A78440`, white, warm ivory,
  restrained taupe. Logo inks: gold `#AD8330`, Labrador `#0D0D0D` / `#F2F2F2`.
- Type in the designs: DM Sans (UI) and DM Serif Display (headings).
- The animated logo (`LogoMoments`) has strict rules: rotations within ±16°,
  keyframes start and end at `rotate(0)`, never hand-edit the rig paths, and it
  is off under reduced motion. Read CLAUDE.md before touching it.

**Accessibility**
- WCAG 2.2 AA: 4.5:1 body text, visible focus, dialogs that trap and return
  focus, `prefers-reduced-motion` respected (video and animation included), no
  nested interactive elements, everything reachable by keyboard.
- Known issue: gold text on ivory fails contrast. Use a darker on-light gold
  ink (about `#7A5C1F`–`#8A6B24`) for gold *text* on light backgrounds. Don't
  change the brand gold globally. `globals.css` has drifted from the spec
  (`#b08d3c` / `#111111` vs `#A78440` / `#0D0D0D`). Reconcile it deliberately,
  with the owner.

**Copy and voice** (applies to every label, email, error and empty state)
- Warm but grounded: plain, human, specific. Readers are Filipino / Metro
  Manila: the public first, then volunteers, then sponsors.
- Avoid the five cold habits:
  1. Categories where people should be.
  2. Hedging verbs.
  3. Nouns doing verbs' work.
  4. Implying you need a dog.
  5. Machine voice in success and error states.
- Write to the person, not the developer: "Payment pending", "To check",
  "We can't read the reference number on this screenshot…".
- **Protected lines (never "improve"):**
  - "There is always room for one more good human."
  - "Good dogs. Good people. Greater Good."
  - "Better humans for better dogs."
  - "Choose what fits you today. You can always explore the others later."
  - "A short hello is perfect."
  - "More than a breed. A way to give back."
- Never invent facts: places, counts, peso amounts, beneficiaries, founder
  details, sponsor tiers. Leave a clear placeholder and ask.
- Emails close with "With love and purpose". The house email style is fixed.
- Use "pack" in CTAs where it does brand work. In body copy prefer
  "community", "families" or "us".

**UI patterns already established** (reuse, don't reinvent)
- Admin: cards, `PageHead`, `Flash`, `NotAllowed` from `app/admin/(app)/ui.jsx`.
  Status pills with tones (`good`, `warn`, `alert`). Tabs with counts on lists.
  A check page per item with the decision at the bottom.
- Public event card (compact): poster with date tile and availability badge,
  type, title, weekday + time, venue + city, price, then **View details** and
  **RSVP** (or the quiet "Opens in…" pill). Everything else lives on the event
  page.

## 8. Local development (owner's Mac)

```bash
npm install
npm test                 # unit tests, no database needed
npm run build            # also runs pending migrations IF DATABASE_URL is set
```

**Safe local admin/database testing.** Use a local Postgres, never the Neon URL
in `.env.local`. Values you set on the command line win over `.env.local`, so
blank the live services explicitly:

```bash
# one-time: a local Postgres 16, e.g.
docker run -d --name hor-pg -p 5433:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=hor postgres:16
# (or: brew install postgresql@16, then createdb on port 5433)

DATABASE_URL=postgres://postgres@localhost:5433/hor DATABASE_URL_UNPOOLED= npm run db:migrate

DATABASE_URL=postgres://postgres@localhost:5433/hor DATABASE_URL_UNPOOLED= \
RESEND_API_KEY= EMAIL_FROM= GOOGLE_APPS_SCRIPT_URL= JOIN_FORM_SECRET= \
CLOUDINARY_API_SECRET= GEMINI_API_KEY= \
ADMIN_DEV_LOGIN=1 ADMIN_OWNER_EMAILS=owner@example.test \
NEXTAUTH_SECRET=local-dev-secret-local-dev-secret NEXTAUTH_URL=http://localhost:3000 \
npx next dev
```

- `npm run build` applies migrations to whatever `DATABASE_URL` is in your
  shell. Never `source .env.local` or export the production URL in a shell
  you build or migrate from.
- Admin: `http://localhost:3000/admin`. The dev login (type an invited email,
  e.g. `owner@example.test`) only exists in `next dev` off Vercel.
- Events: `http://localhost:3000/events`. Hosts can be tested with
  `http://events.localhost:3000` after `npm run build && npm start`.
- For browser checks, Playwright or Chrome DevTools MCP (configured in
  `.codex/config.toml`) both work. Check a phone width (390 px) and a desktop
  width (1280–1440 px).

## 9. Feature index (details in CLAUDE.md)

- **Main site:** stories, journey timeline (`app/content/journey.js`, photos in
  `public/journey/<id>/`), Instagram feed (rotating token in a private Blob +
  daily cron), Pack, Supporters section (`#partners`), Join modal → `/api/join`
  → Apps Script/Sheet + `people` table + "application received" email. Footer
  legal name / SEC number from `/api/legal`; `/privacy` is linked from Join,
  RSVP, payment proof and every public footer.
- **Events:**
  - Admin-managed events with cover framing (`PhotoCropper`) and up to 3 more
    photos with fit/fill/tile.
  - Price tiers (up to 6) with **sale periods** and **first-N limits**.
  - All-day events, partners/sponsors, venue search (Nominatim, button-press
    only), add-to-calendar, share menu, and per-event pages with schema.org data.
  - The editor's Preview uses the public components.
  - Ended events move to "Where we have been" (`hasEnded`).
- **RSVP and payments:**
  - Ticket choice. Event pricing can be per registration (the existing default), per person, per furbaby, a human + furbaby bundle, per person with a configurable number of included dog companions and an extra fee per additional furbaby, or ticket-specific rules: Hooman only (per person, no furbabies) and Furbaby package (per dog, with included people and an extra-person fee). Registration counts are stored with the calculated amount due; human + dog companion first-N limits count people, while event capacity remains registration-based for now.
  - Free event → the confirmed pass (QR) is emailed.
  - Paid event → spot held as "Payment pending". The registrant uploads the
    method, reference, amount and a screenshot, which moves it to "To check".
  - An admin with `registrations:fees` either approves it ("Paid"; the QR pass
    is emailed) or asks for a new receipt. Admins can also mark paid by hand,
    attach a receipt, or add a registration by hand.
  - Duplicate references are flagged. No QR before approval; the door says
    "Payment not confirmed".
  - Different people may share an email. Public exact name+email repeats are
    blocked; an admin may confirm an intentional exact repeat.
  - Admins with `registrations:edit` can edit registration details and attendee
    counts. Saving does not send email unless the admin explicitly ticks the
    email option; a paid registration cannot be changed to a different amount.
  - Admin Delete is only for unpaid, unchecked-in registrations. It moves the
    record to Recently deleted for 30 days, frees its slot/ticket and disables
    its pass; Restore reverses it when capacity permits. A daily cron purges
    expired records and their receipts. Paid/checked-in rows stay as history.
  - Non-refundable notice. Waitlist.
  - Scheduled RSVP opening with a live countdown and a "Remind me" button.
  - Per-event RSVP controls: a custom public button label and a registration-open switch. Events can also show an optional vaccination-record photo field; records are private to authorised admins and are never emailed or public.
- **Check-in:** `/admin/checkin` scans the QR (`Scanner.jsx`, camera allowed only
  on admin). Outcomes come from `checkInOutcome`.
- **People:** one record per person and kind, profiles, photos, membership
  (applicant → active → inactive/left), numbers HOR-YY-NNNN / HORV-YY-NNNN,
  import from the Join sheet CSV, and send-template emails.
- **Sponsors & partners:** records with a user-written relationship label, tier,
  logo, blurb and contributions; public only when confirmed, shown on site, and
  complete. Numbers HOR-XXXX-YY-NNNN; existing three-letter IDs are upgraded
  only when that record is deliberately saved. Admin has card/list views and
  search, relationship, kind and status filters.
- **Email templates:** built-ins (editable wording) plus HOR's own acceptance
  and event templates, live preview, and "Send a test to me".
- **Event albums (Cloudinary):** the event editor has an Album card for *past*
  events. You can upload many photos at once. They are shrunk in the browser
  (2000 px WebP, location data removed) and capped again by Cloudinary. Each
  photo has a description and Remove. Uploads are signed by the server
  (`app/admin/eventPhotos.js`, `app/lib/cloudinary.mjs`), so photos skip the
  4 MB action limit. Past event pages show a Photos grid and a full-screen
  viewer. Deleting an event removes its album. The `event_photos` table is
  already shaped for participant uploads (source, status). The full plan is in
  `docs/event-albums-plan.md`.
- **Payment settings:** approved channels with two-Owner approval.
  `/api/support-details` shows only approved methods.

## 10. Open items (as of 13 Oct 2026)

Things the owner/HOR does in the admin (not code):
- Enter the GoTyme details in Payment settings. A second Owner approves.
- Mark registrations people paid *before* the system went live as paid
  (Mark paid / Attach receipt). They show as "Payment pending" until then.
- Bedazzle event: set the early-bird sale period or first-N limit in the
  editor.
- HOR to finalize sponsor tier names and amounts (`TIERS` in
  `app/lib/supporters.mjs`; keep the keys, change the labels).
- Enter past events and link their slugs in `app/content/journey.js` (check
  what's done).

Code work, roughly in priority order (confirm scope with the owner first):
Completed 13 Oct 2026: the expired countdown page, preview cookie/key and launch
gate were removed. `app/lib/hostRouting.mjs` keeps the still-attached
`countdown.` hostname as a permanent redirect to www; the owner removes that
domain in Vercel after the production release.

1. **Accessibility pass.** Re-verify the Aug 2026 findings against current code
   (several were fixed). Then fix what remains: on-light gold text, the brand
   token drift, autoplay video pause control, nested interactive in family
   cards, and landmark/skip-link order.
2. **Albums phase 2.** Participant uploads through a share link per event
   (`events.…/share/<token>`, with a QR), an approval queue (every participant
   photo waits for an admin), reordering, using an album photo as the cover,
   Gemini-suggested descriptions, a photo count on past cards, and "Ask us to
   remove a photo". The design is in `docs/event-albums-plan.md`.
3. Email delivery tracking (Resend webhooks: delivered or bounced, shown on a
   registration or person). Proposed, not built.
4. Transparency: donations and spending reports (HOR promises public amounts).
   Not built.
5. Later phases: member portal (members log in, get event updates; guest
   album uploads use `events.photo_uploads`), forms builder, content editing,
   privacy requests, online checkout (PayMongo; current payments are manual
   QR / e-wallet / bank).

## 11. Working with the owner

- They are a designer. Lead with what changed for a visitor or admin, in plain
  words, with a screenshot or the URL to try. Skip the implementation tour
  unless they ask.
- They may write in Filipino, English or a mix. Reply in clear English unless
  they write fully in Filipino.
- New screens: when they ask for design first, design it in Figma (their HOR
  file: "Events prototype", "Foundations & notes", "Admin module (Oct 2026)"
  pages) and build after. Match the existing frames' type, spacing and
  components. If you can't reach Figma, say so, then propose the layout in words
  or as an HTML mock.
- Give a recommendation, not just options. When they ask "what do you think?",
  answer as a senior UX designer would. Say what you'd do and why, and name the
  trade-off.
- Ask before anything irreversible or anything touching money, live data,
  emails to real people, or production.
- End each finished change with: what's on staging, how to check it, and
  "say *push to main* when you're happy".

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
