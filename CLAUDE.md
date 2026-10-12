# Claude Code handoff

## Product goal

Refactor and continue the House of Retrievers concept site without changing its approved brand direction. The primary visitor action is joining the community as a member, volunteer, or partner.

## Non-negotiable brand constraints

- Preserve the exact supplied two-dog silhouette logomark. Do not redraw, reinterpret, or replace either dog.
- Keep the icon on the left and the complete text mark on the right.
- On dark surfaces the logo uses the reverse artwork (white Labrador and wordmark) so the Labrador, wordmark, paw, and lines remain readable.
- The Golden Retriever stays in the original brand gold.
- Logo artwork (Oct 2026): "The House of Retrievers Society Inc." Source SVGs are in `brand/` (see `brand/README.md`); the site uses PNGs rendered from them on the 1396 x 564 canvas. Logo inks follow the artwork: gold `#AD8330`, Labrador `#0D0D0D` on light and `#F2F2F2` on dark (`--hor-gold` / `--hor-lab`).
- Primary palette: near-black `#0D0D0D`, retriever gold `#A78440`, white, warm ivory, and restrained taupe.
- Maintain accessible contrast and respect `prefers-reduced-motion`.
- The header, footer, events header and countdown use `app/components/LogoMoments.jsx` (the countdown passes `scheme` so moments follow its own light/dark switch). Every 7–15 s one dog, or both, has a short moment and returns exactly to the static pose, so there is no visible swap. Light mode plays daytime moments (wag, look up, give paw, perk, sniff); dark mode plays evening ones (doze, tail thump, stargaze, snuggle). `tone` is the surface: "dark" uses the white Labrador and reverse wordmark, "light" the near-black ones, "auto" (footer) follows the colour scheme. The dogs are an inline SVG traced from the reverse logo (`app/lib/logoMomentsRig.mjs`; never hand-edit the paths, rebuild with `python3 scripts/logo/extract_logo_layers.py`); the wordmark is the supplied art with the dogs cleared (`public/house-of-retrievers-wordmark-*.png`). Each moving part is the dog's path clipped to `clip` and rotated about `origin`, with `cut` masked from the still body; keep rotations within about ±16° so the overlap hides the joint. Moment sets and timings: `app/lib/logoMoments.mjs`; keyframes: `globals.css` "Logo moments", all starting and ending at `rotate(0)`, which is what makes the hand-off seamless. Off under reduced motion, off-screen and in hidden tabs; unprompted moments stop after 8 (WCAG 2.2.2), hover/focus still plays one.

## Current implementation

- Next.js 15 App Router with React 19
- Deployed on Vercel as a Next.js server app. The old static export to `dist/client` and its worker entrypoint were retired once server routes were needed.
- Page composition lives in `app/page.jsx`; sections are components in `app/components/`
- Editable content lives in `app/content/` (`activities.js`, `families.js`, `join.js`)
- Styling lives in `app/globals.css`
- Server routes in `app/api/`: `instagram` (feed proxy), `join` (form intake), `rsvp`, `support-details`, and `auth` (admin sign-in)
- Secrets stay server-side and are managed in Vercel. Pull them locally with `npx vercel env pull .env.local`. Never expose them via `NEXT_PUBLIC_`.

## Refactor status

1. Done — `app/page.jsx` is split into `Header`, `Hero`, `PurposeStories`, `InstagramFeed`, `Pack`, `FinalCta`, `JoinModal`, and `Footer` under `app/components/`.
2. Done — activities, founding families, and join copy live in `app/content/`, documented with JSDoc typedefs. The repo is plain JSX; confirm with the owner before introducing TypeScript.
3. Preserve the current information architecture and primary Join the Pack CTA.
4. Done — every image is now an approved House of Retrievers asset with alt text describing what is actually in the frame. The Unsplash preconnect is gone. Story photos live in `public/1-purpaws/purpaw[n].jpg` and `public/2-better/better[n].jpg`; add to a gallery by dropping the next number in the folder and appending an entry in `app/content/activities.js`.
5. Done — the join form posts to `app/api/join/route.js`, which forwards to Google Apps Script with `JOIN_FORM_SECRET` in the request body so the secret never reaches the browser. Verified end to end in production. The field names are a contract with `scripts/apps-script/Code.gs`: the payload nests under `submission` and uses `joinType`, `socialProfile`, `socialUrl`, and `furbabyName`. `socialUrl` is what makes the sheet cell a clickable link. Rename in one place and submissions are silently rejected, so change both together and redeploy the script.
6. Retired — the ChatGPT Sites packaging scripts were removed after the deployment moved to Vercel.

## Events subdomain

`events.houseofretrieversph.org` is served by this same project, not a second app.

- `middleware.js` calls `routeEventsRequest()` in `app/lib/eventsHost.mjs`. On the events host every page path is rewritten to the `/events` routes, so `events.…/` renders `app/events/page.jsx` and the address bar keeps the subdomain.
- One address per page: `events.…/events/x` redirects to `events.…/x`, and `www.…/events/x` (or the apex) redirects to the subdomain. Preview deployments and localhost are left alone so `/events` can be reviewed before the domain is live.
- API routes, `/_next` and any path with a file extension are not rewritten, so the join form, images and `robots.txt` work on both hosts.
- Links from the events pages back to the main site must be absolute (`HOME_URL`). The main header links to `EVENTS_URL`.
- Event data lives in `app/content/events.js`. Add an event only when HOR has confirmed every field. An event moves to "Where we have been" and stops taking RSVPs once it has ended (`hasEnded` in `app/lib/eventTime.mjs`: the end time in Manila; three hours after a start time given alone; midnight for all-day or untimed events); the events pages revalidate every 5 minutes.
- Local check: `npm run build && npm start`, then open `http://events.localhost:3000`.
- Go-live order: add `events.houseofretrieversph.org` in Vercel → Project → Settings → Domains first (DNS is on Vercel, so the record and certificate are automatic), then merge. Merging first would send the header's Events link to an address that does not resolve yet.
- Search Console: use a Domain property for `houseofretrieversph.org` so the subdomain is covered and the cross-host sitemap entry is accepted.

## Countdown (temporary, until 10 Oct 2026, 5 PM Manila)

Until `LAUNCH_AT` in `app/lib/countdownHost.mjs`, the main site (www and apex) redirects (307, no-store) to `countdown.houseofretrieversph.org`, which renders `app/countdown/`. At `LAUNCH_AT` the redirect stops by itself and the countdown host sends visitors to www; no deploy needed. Events, admin, API and files are untouched. Only a browser that opened `www.…/?preview=<COUNTDOWN_PREVIEW_KEY>` (cookie, 7 days) sees the main site early; `?preview=0` clears it. Deliberately not by IP: phones on the same Wi-Fi share it. Quotes rotate on a shared schedule (5–15 min slots) in `app/countdown/quotes.mjs`. Remove the module, the middleware call and the Vercel domain after launch.

## Admin module (Phase 1)

`admin.houseofretrieversph.org` is served by this project from `app/admin/`, routed like the events subdomain (`app/lib/adminHost.mjs`). On previews and localhost it lives at `/admin`. The plan is the "Admin module plan" tab of the HOR audit doc; screens are on the "Admin module (Oct 2026)" page of the HOR Figma file.

- **Database:** Neon Postgres (free), added through Vercel, sets `DATABASE_URL`. Schema in `db/migrations/*.sql`. `npm run build` applies new files first when `DATABASE_URL` is set (each once, recorded in `schema_migrations`, under an advisory lock, over `DATABASE_URL_UNPOOLED` when present). Locally: `npm run db:migrate`. `app/lib/db.js` keeps DATE columns as `YYYY-MM-DD` strings on purpose; a JS Date shifts the day by the server's UTC offset.
- **Without `DATABASE_URL` the public site behaves exactly as before:** events come from `app/content/events.js`, the Support panel shows its built-in preview, RSVPs are off. Don't break that fallback.
- **Sign-in:** next-auth v4, Google only, JWT sessions signed with `NEXTAUTH_SECRET`, or, when that is unset, a key derived from `DATABASE_URL` (`sessionSecret()` in `app/lib/admin/auth.js`); `NEXTAUTH_URL` = the admin URL in production. Only active rows in `admins` or emails in `ADMIN_OWNER_EMAILS` get in; env Owners are upserted with the Owner role on sign-in. While the Google app is in Testing, every admin must also be a Google "test user".
- **Roles** live in `app/lib/admin/roles.mjs` and are re-read from the database on every page and action (`app/lib/admin/guard.js`). Never trust roles from the cookie or the form.
- **Payment details** change only through `payment_change_requests`: a different Owner approves, after a sign-in in the last 10 minutes, with the "checked against HOR's records" box ticked. Switching a method off is immediate. The database also refuses a self-approval and a second pending request per method.
- **Event photos** are uploaded in the event editor and framed there at the card's 16:10 (`PhotoCropper.jsx`: drag, zoom, pinch, arrow keys). The browser sends the 1600×1000 crop plus the uncropped original (longest side 2400) and the framing; `events.image_source` / `image_crop` keep those so "Adjust framing" re-crops from the original, not the saved crop. All are stored in the `event_images` table and served by `/api/event-image/[id]` with a one-year immutable cache. A new upload gets a new id; nothing is edited in place. Not Vercel Blob, for the same reason as Join photos.
- **Prices:** `events.price_tiers` (`[{label, amount, from?, until?, limit?}]`, up to 6, ₱; 0 = free) is the record. A tier can also be limited to the first N registrants ("Only for the first registrants"; e.g. an early bird for the first 20): registrations are counted per ticket by label + amount (`tierKey`; not cancelled, so pending payments and the waitlist count and a cancellation frees a place; `app/lib/ticketCounts.mjs`), under the event row lock in `/api/rsvp`; once all N are taken the tier isn't offered, the card shows the other prices, and the event page marks it "Sold out". The RSVP shows "First 20 registrants · 3 left". A tier can have a sale period ("Sale period" in the editor, Manila date + time; e.g. an early bird that ends on a date): outside it the tier isn't offered on the RSVP (`tierAvailable` / `activeTiers` in `app/lib/prices.mjs`; `chooseTicket` takes an index into the full list and refuses an ended tier, except for an admin adding someone by hand), the card's price shows only tiers on sale, and the event page lists ended ones struck through (`tierWindow`: "Until Oct 10, 11:59 PM", "Ended Oct 10"). `cost` is saved as the summary the cards show (`priceSummary` in `app/lib/prices.mjs`: "Free", "₱795", or lowest–highest). Events saved before tiers fall back to their `cost` text. The price sits in the card footer with RSVP, not among the badges.
- **Extra photos:** `events.gallery` holds up to 3 more pictures (4 with the cover), uploaded one at a time by `uploadEventPhoto` in `app/admin/eventTools.js` when picked (a save would otherwise exceed the server-action size cap). The event page shows the uncropped cover then these, whole, in `EventMedia`; its header band is the cover, blurred.
- **Fill per picture:** `events.image_fit` (cover) and each gallery entry's `fit`: `fit` (whole, blurred backdrop), `fill` (cover uses the framed crop), `tile` (repeated). Picked with `FitPicker.jsx`.
- **Preview:** the editor's Preview button (`EventPreview.jsx`) builds the event from the unsaved form through `toPublicEvent` and draws it with the public `EventDetailPage` / `EventCard`, at desktop or phone width. The event page lays itself out with a container query on `.event-detail-wrap` (not screen media queries), which is what lets the preview show the true phone layout inside a desktop window. Keep new event-page layout rules as container queries.
- **Event page layout (Figma "Event page — UX pass", 11 Oct 2026):** two columns from 960 px of page width (poster left, sticky; facts, price card with RSVP, about, what's included, map, hashtags right); a phone bottom bar with price + RSVP that hides while the main card is on screen. `venue_address` is the smaller line under the venue name; `included` is the "What's included" checklist; a placeholder beneficiary (TBA, "To be named"…) is never shown and doesn't count for publishing (`isPlaceholder`). Add to calendar: `app/lib/calendar.mjs` (Google link + .ics, Asia/Manila).
- **All day and supporters (12 Oct 2026):** `events.all_day` hides and clears the times (shown as "All day", a date-only calendar entry). `events.partners` / `events.sponsors` are up to 8 names each, picked from People (Partner / Sponsor, organisation first) or typed (`SupportersField`), shown on the event page under "With thanks to".
- **Sponsors & partners (12 Oct 2026, Figma "Sponsors & partners" on the Admin module page):** `supporters` table (migration 014), one record per organisation: kind, status (inquiry → talking → confirmed / ended), a 3-letter ID `code` (required to confirm, suggested by `suggestCode`, fixed once numbered) and a number HOR-XXX-YY-NNNN (`supporterNumber`; `number_year` / `number_no` set the first time it's saved Confirmed, YY = the linked Join form's year else the record's, one sequence for sponsors and partners per year, advisory lock 727011, migration 017), sponsor tier (`TIERS` in `app/lib/supporters.mjs`: Pack Leader / Best Friend / Good Pup — names are HOR's to change, keys stay), logo (stored in `event_images`, resized in the browser to 800 px WebP/PNG by `LogoField`), website, Instagram, blurb (≤200), what they gave (cash / in-kind / services / venue, per year), private contact and notes. Admin: `/supporters` (list, S1) and `/supporters/[id]` (record, S2); actions in `app/admin/supporterActions.js`; "Make a sponsor record" on a Sponsor/Partner in People. Public only when `isPublic` (confirmed + show_on_site + logo + blurb); Ended switches it off. Amounts are public (HOR's transparency promise) only once `amounts_agreed_at` is set ("The sponsor knows these amounts are public"). The home page section `Supporters.jsx` (above FinalCta, `#partners`; option A, the menu is unchanged) reads `/api/supporters` (5-minute edge cache, no contact data): partners, sponsors by tier, a totals bar, a detail dialog, and "Become a sponsor or partner" (opens Join as Sponsor). `?supporter=<slug>` opens a panel; event pages link supporter chips there (`supporterLinks` in `app/lib/publicSupporters.js`). Events link to records by name in their Partners / Sponsors fields, which suggest record names first.
- **Event payments (12 Oct 2026, Figma "Event payments" on the Admin module page):** on a paid event (`fee_required`) the RSVP asks for a ticket (`events.price_tiers`, public `tickets`; `chooseTicket`), stores `ticket_label` / `ticket_amount`, and holds the spot with `fee_status` `waiting` ("Payment pending"; no time limit, HOR confirms by chat and cancels backouts). The registrant pays by the approved channels (Payment settings, now with GoTyme) and uploads method, reference number, amount and their confirmation screenshot (`PayStep.jsx`, in the RSVP modal and on the pass page; `/api/rsvp/proof`) → `review` ("To check"); screenshots go in `payment_proofs` (private, served to admins by `/registrations/proof/[id]`; older uploads kept). An admin with `registrations:fees` opens the registration (`/registrations/[eventId]/r/[regId]`): Approve (tick "found it in HOR's history") → `paid` and the QR pass is emailed; Ask for a new receipt (reason, presets in `REJECT_REASONS`) → `rejected` and the reason is emailed; Mark paid by hand (cash etc.); Attach / replace a receipt. "+ Add registration" (`/registrations/[eventId]/add`, `registrations:edit`) adds people who paid before the system (Paid / Pending / No fee; over capacity allowed). The same reference twice in one event is flagged (`referenceKey`). No QR before approval: the pass page (`passState`) shows the pay step / "under review" / the reason, and the door (`checkInOutcome` → `unpaid`) says "Payment not confirmed". Non-refundable (`NO_REFUND`) is shown on the pay step, pass page and emails. Rules and labels: `app/lib/eventPayments.mjs`; admin actions: `app/admin/registrationActions.js`; emails: `app/lib/passEmails.js` (`sendPass` with the QR picture from `/api/pass-qr/[code]`, `sendSpotHeld`, `sendReceiptRejected`, `sendWaitlisted`). Migration 018.
- **Compact event card (12 Oct 2026, Figma "Event card — compact" on the Events prototype page):** `EventCard` shows only the poster (with a date tile and the availability badge on it), event type, title, weekday + time, venue + city, price, and two actions: View details (to the event page) and RSVP / Join the waitlist (or the quiet `OpensPill` countdown while RSVPs open later). Summary, hashtags, purpose, directions, parking and share live on the event page only. The poster link is `aria-hidden` and out of the tab order; the title is the real link. Past cards: no price or actions, the year on the tile, "See the recap".
- **Scheduled RSVP opening (12 Oct 2026):** "Open RSVPs at a set time" in the editor's sign-ups (date + time, Manila) saves `events.rsvp_opens_at` (migration 019; must be before the event ends, `readOpensAt` in `app/lib/rsvpOpens.mjs`). Until then `publicStatus` is `soon` ("RSVP opens soon"): the cards, the event page and the phone bar show `RsvpCountdown` (ticks every second; screen readers get the opening time once; "Remind me" adds it to Google Calendar) instead of the RSVP button, and `useLiveEvent` in `EventsView.jsx` switches to `openStatus` the moment it reaches zero, without a reload (the pages are cached for 5 minutes, so the browser does the flip). `/api/rsvp` refuses sign-ups before the time, whatever the browser shows. The admin events list shows "Opens …".
- **Every admin action confirms first:** buttons that change something use `app/admin/(app)/ConfirmButton.jsx` (checks the form, opens a dialog saying what will happen, submits through the same button only on "Yes"). Use it for any new action; `ConfirmSave` / `ConfirmMembership` cover the event and membership forms. The registrant's "Send for checking" asks too.
- **Photos from guests:** `events.photo_uploads` lists who may add album photos (attendees, members, volunteers, partners, sponsors). Stored only; it takes effect when the member portal is built.
- **Event details:** `is_charity` reveals the beneficiary (`supports`, cleared when unticked, required to publish when ticked); `purpose` is one of `PURPOSES` in `app/lib/admin/events.mjs`; summaries go up to `SUMMARY_MAX` with line breaks kept (cards clamp, the event page shows all); up to six `hashtags`.
- **Venue map:** the editor searches OpenStreetMap Nominatim through the `searchPlaces` action in `app/admin/eventTools.js` (button press only, one request a second, cached: Nominatim's free-use rules forbid search-as-you-type). Picking a place fills Venue/City and stores `venue_lat`/`venue_lng`; an optional Google Maps share link (`map_url`) wins for "Get directions". No Google API key or billing involved.
- **Photo description** is optional. With `GEMINI_API_KEY` set (Google AI Studio, free tier) the editor suggests one from the cropped photo via `describePhoto`; it never overwrites text someone typed. `GEMINI_MODEL` overrides the model when Google retires `gemini-2.5-flash`.
- **Event pages and sharing:** each event has its own page, `events.…/<slug>` (`app/events/[slug]/page.jsx`) with its cover as the share image and schema.org Event data; it is listed in the sitemap. `app/lib/share.mjs` builds the Facebook/X/Threads links and the Instagram caption (Instagram has no web share link, so the caption is copied). `ShareMenu` is used on the cards, the event page and the admin's "Share this event" card.
- **Activity log** (`activity_log`) is append-only. Add a label to `app/lib/admin/activity.mjs` for any new action.
- **Server actions** are in `app/admin/actions.js`. Give each submit button its own action (`formAction`); the clicked button's name/value is not reliably sent.
- **Public pieces:** `/api/rsvp` (spam guard, row lock for the last slot), `/r/[code]` on the events host (check-in pass and QR), `/api/support-details` (approved methods only), and the Join form also files people into `people` (best effort; the sheet stays the record).
- **Local testing:** run a Postgres, migrate, then `ADMIN_DEV_LOGIN=1 ADMIN_OWNER_EMAILS=you@example.test DATABASE_URL=… NEXTAUTH_SECRET=… NEXTAUTH_URL=http://localhost:3000 npx next dev`. The dev login only exists in `next dev` off Vercel.
- **People (11 Oct 2026):** one record per person and kind (unique `(kind, lower(email))`, migration 010 merged older duplicates). The Join route upserts: a repeat submission updates the record, appends the new message and bumps `joined_count`. A small copy of the Join photo (480 px WebP via sharp) goes in `person_photos`, served only to admins by `/people/photo/[id]` (private cache); the full photo stays in Drive. Each person has a profile (`/people/[id]`): contact, membership, follow-up, events matched by email, and history from the activity log (`details.personId`). Members and Volunteers have `membership` (applicant → active → inactive / left; `hasMembership`); the first activation sets `member_since`, `member_year` and `member_no`, shown by `memberNumber` as HOR-YY-NNNN for members and HORV-YY-NNNN for volunteers (`NUMBER_PREFIX`): the Manila year they registered (Join form, `created_at`) plus a sequence per kind that restarts at 0001 each year, assigned under advisory lock 727010 (migrations 011–012 renumbered earlier members; 017 made the unique index per kind and set volunteers to applicant). "Import from sheet" (`/people/import`, `app/lib/admin/peopleImport.mjs`) reads the Join sheet's CSV and fills only blanks for people already there.
- **Email (Resend):** `app/lib/email.js` sends through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set (replies go to `EMAIL_REPLY_TO`); otherwise it skips quietly. Templates in `app/lib/emailTemplates.mjs` (HTML + plain text, voice per the content notes): application received (sent by the Join route), welcome (sent when an admin makes a Member active, if ticked), the pass with its QR picture (free events at RSVP, paid events on approval), "spot held" with how to pay, "new receipt needed", and the waitlist note (`app/lib/passEmails.js`). Each send has an idempotency key. The From address must be on the domain verified in Resend. The header is one baked image (`public/email/header.png`, logo on its ink band) because Gmail's dark mode recolours backgrounds but not images; Apple Mail / Outlook get real dark colours via `prefers-color-scheme`. Every email uses the house style HOR approved (centered logo band, "With love and purpose" sign-off, logo badge). A new Member's Join email is HOR's own welcome copy (`memberRegistered`: centered header `email/header-center.png`, sign-off, logo badge `email/badge.png`); repeats and other kinds get the short note. Domain verified 11 Oct 2026; From `hello@houseofretrieversph.org` (send-only, no mailbox), replies to `houseofretrieversph@gmail.com`.
- **Email templates (12 Oct 2026):** admin Settings → Email templates (`/emails`, people:edit). "Sent automatically" are the built-ins in `EDITABLE_TEMPLATES` (`app/lib/emailTemplates.mjs`): Join replies per kind (`member-registered`, `received-volunteer` / `-partner` / `-sponsor`, picked by `receivedKey`), welcomes when made Active (`member-welcome`, `volunteer-welcome`, `welcomeKey`) and `rsvp-confirmed`; saved wording in `email_templates` (no row = the default, `loadTemplate` in `app/lib/emailSettings.js`). "Your templates" are HOR's own, any number, in `custom_email_templates` (migration 016) of two `CUSTOM_KINDS`: **acceptance** (sent from a profile's "Send an email" card, `sendTemplateToPerson`, or picked in the membership form when making someone Active) and **event** (picked in the event editor's "Confirmation email", `events.email_template_id`; `/api/rsvp` uses it for confirmed spots, else the saved `rsvp-confirmed`; the waitlist note is fixed). Pages `/emails/[key]`, `/emails/new?kind=`, `/emails/custom/[id]`, one `TemplateEditor`. A template ref is a built-in key or `custom:<kind>` (`templateDef`). Variables per template (`TEMPLATE_VARIABLES`: names, furbaby, organization, role, member_no, event_title/date/venue); unknown ones are refused on save. Message: blank line = paragraph, `**bold**`; variables are filled after escaping. Event templates get the event box, fee note and pass button added. The frame, sign-off and footer stay fixed. Live preview and "Send a test to me" (`SAMPLE_PERSON`). Deleting an event template sends those events back to the standard one.
- **Profile photos and membership confirm (12 Oct 2026):** admins add, change or remove a person's photo on their profile (`PersonPhotoField`, `uploadPersonPhoto` / `removePersonPhoto`; same 480 px WebP store as Join photos); People has a "No photo yet" filter (`?photo=none`). Saving membership asks first (`ConfirmMembership`): the change, the member number a first activation gets, and whether the welcome email goes.
- **Not built yet (later phases):** gallery, forms builder, content editing, donations and spending, privacy requests, online checkout.

## Instagram feed and its token

The feed at `app/api/instagram/route.js` needs a long-lived Instagram token,
and those expire 60 days after they are issued. A running function cannot
rewrite its own environment variables, so the token does not live in one.

- The **live token sits in a private Vercel Blob**, `instagram/access-token.json`,
  read and written through `app/lib/instagramToken.js`.
- `INSTAGRAM_ACCESS_TOKEN` is only a **seed**. It is used until the first
  rotation writes a blob, and as a fallback if the blob cannot be read. After
  the first rotation it is stale and is no longer what the feed serves —
  replacing it changes nothing while the blob is healthy.
- A **daily cron** (`vercel.json` → `/api/cron/refresh-instagram-token`) trades
  the current token for a fresh 60-day one through `ig_refresh_token`, with no
  re-authentication. It returns early while the token is under 30 days old, so
  most runs cost nothing. Daily rather than monthly on purpose: monthly gave the
  rotation a single attempt, and one failure would have run out the clock.
- The cron route answers only to Vercel's signed call (`CRON_SECRET`).
- Blob reads go through the SDK with the CDN cache off. A private blob cannot be
  fetched from its URL, and a cached copy would hand back the token just replaced.

To recover if the blob is ever lost: generate a token, set it as
`INSTAGRAM_ACCESS_TOKEN`, redeploy, and the next cron run re-seeds the blob.

## Join photos

An optional furbaby photo is resized in the browser (`app/lib/resizeImage.js`,
longest edge 1600, quality 0.82) and travels as a base64 data URL through
`app/api/join/route.js` to the Apps Script, which files it in Drive and links
the sheet cell to it.

- Photos go to **Drive, not Vercel Blob**. Blob on Hobby cuts off access for
  thirty days once its limits are passed, and the Instagram token lives there —
  photo traffic must not be able to take the feed down with it.
- The folder is found by the id in the `PHOTO_FOLDER_ID` script property, so
  renaming it in Drive is safe. `PHOTO_FOLDER_NAME` is only the fallback.
- Files are **not shared**. They are personal photos offered to join a
  community; the owner opens them signed in.
- They cannot be displayed inside a cell. Google blocks `drive.google.com`
  URLs in `IMAGE()`, and the old `/uc?export=view` workaround now returns 403.
  Clicking the cell's link shows Sheets' own preview card, which works on a
  private file — that is the display. Making it work in-cell would mean
  publishing the photos.
- Adding a Drive call to the script needs the scope granted by hand: run
  `authorizeDrive` from the editor. Apps Script grants only the scope a run
  reaches for, so the function has to write, not just read.

## Media conventions

- Story media lives in per-section folders under `public/`: `1-purpaws/`, `2-better/`, `3-giveback/`.
- Camera originals stay local. `.gitignore` keeps `public/**/*.JPEG` and `public/**/MBY.mp4` out of the repo, so committed media is always the web-ready copy.
- Encode video as H.264 (`libx264`, yuv420p, `+faststart`). HEVC is hardware-gated and silently fails on Windows Chrome and Firefox, so it must not ship. Background loops sit at 1280–1600 wide, CRF 23–28, no audio track.
- Poster images are pulled from the video's own first frame, so the still does not jump to a different scene when playback starts.
- Keep photos near their rendered size: the family cards render around 410px wide, so the longest side belongs at 1440, not 4096.

## Verification

Run:

```bash
npm install
npm run build
```

Confirm desktop and mobile header/footer logo legibility, story switching, pack-view tabs, modal open/close behavior, form success state, keyboard focus, and reduced-motion behavior.
