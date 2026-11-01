# Brands per event — design (1 Nov 2026)

## Why

Brands don't commit to HOR as a whole; each brand decides event by event. Today
each brand has one status (Inquiry / Talking / Confirmed / Ended), one tier and
one set of amounts in Sponsors & partners, and the Guest list sends brand letters
outside any event. That makes it look as if a brand is "in" for every event.

The owner's direction (their words, condensed): the Sponsors & partners page is a
**library / directory** of brands and the contact person to send invites to. Brands
are **selected and invited per event**, and **invite tracking happens inside the
event being managed**. A status on the brand itself doesn't matter for other events.

## Goals

1. **Brands directory** (admin page now called Sponsors & partners): who the brand is,
   its logo, blurb, website/Instagram, contact person + email + number, greeting,
   letter address, notes. No commitment status on the brand.
2. **Brands tab per event**: invite brands from the directory to *this* event and
   track, per brand and per event:
   - role at this event: Partner or Sponsor (a brand can be a Partner at one event
     and a Sponsor at another)
   - invite letter + its email status (delivered, bounced… from `letter_sends`)
   - their reply: **No reply yet** / **Yes** / **No**, with an optional follow-up date
   - what they're giving: kinds (cash, in-kind, booth, venue, services, prizes…),
     cash amount, in-kind value, note
   - for brands with a booth or people coming: booth requirements, representatives
     attending, dogs attending (the fields hidden from the brand form today belong here)
   - notes (admins only)
   - counts at the top: invited, said yes, said no, waiting
3. **Send invite letters from the event**: tick brands on the event's Brands tab →
   the existing letter send flow, with the event filled in, sent only to the ticked
   brands. Each send is logged against that event.
4. **Public site shows only brands that said Yes**: an event's "With thanks to" lists
   its Yes brands; the home page "Brands that have joined our events" shows a brand
   only if it said Yes to at least one published event (plus the existing switch,
   logo and blurb).
5. **Brand page shows its history**: every event the brand was invited to, with role,
   reply and what they gave.

## Non-goals

- No brand-facing page or self-service RSVP (replies are recorded by admins).
- No automatic reminders or follow-up emails.
- No Resend webhooks (statuses keep coming from polling, as now).
- No visual change to the public sections beyond who appears in them.

## Anti-goals (a failure even if it works)

- A brand appearing on an event page or the home page without having said **Yes** to an event.
- Any existing brand, contact, logo, or the names already listed on past events being lost.
- Anything emailed without an admin ticking it and pressing send.
- Changes written to production during testing; migrations that drop or rewrite columns.

## Decided with the owner

- Directory + per-event invites, as above (mockup "brands-per-event", approved 1 Nov 2026).
- Role (Partner/Sponsor) is per event.
- Only Yes brands show publicly.
- Existing brands already listed on past events carry over as "said Yes" for those events.
- Brand letters move out of the Guest list into the event's Brands tab.
- The event page header gets a **Brands & partnerships** button next to RSVPs that opens
  that event's **Brand tracker** page (the "Brands tab" in this document), where invites
  are monitored.
- The Brand Tracker sheet imported on 1 Nov 2026 is for **Golden Beginning: Paws and
  Purpose** (event `2d974ade-c0f6-4a01-8540-9049010366cf`, 30 Nov 2026). Its outreach
  columns on `supporters` (invite status, invited on, follow up on, RSVP, agreement,
  assigned to, booth needs, representatives / dogs attending) are copied into
  `event_brands` rows for that event: RSVP confirmed → yes, declined → no, else waiting;
  role from the brand's kind; only brands with any outreach value set. Assigned to and
  agreement go into the row's notes.

## Data (proposal)

- New table `event_brands`: `event_id` → events, `supporter_id` → supporters, unique
  per pair; `role` (Partner/Sponsor); `reply` (waiting/yes/no, default waiting);
  `follow_up_on` date; `gives` text[]; `cash_amount`, `in_kind_value` (pesos, whole);
  `in_kind_note`; `booth_needs`; `reps_attending`, `dogs_attending`; `notes`;
  `replied_at`; `added_by`, timestamps.
- `letter_sends` gets a nullable `event_id` so an invite's email status belongs to
  that event (existing rows stay null).
- Backfill (in the migration, additive): for every event, each name in `events.partners`
  / `events.sponsors` that matches a supporter (case-insensitive, not deleted) becomes an
  `event_brands` row with that role and reply = yes.
- `events.partners` / `events.sponsors` stay as they are and are **kept in sync** with the
  event's Yes brands whenever the Brands tab changes, so existing readers (event page
  "With thanks to", share text, `publicSupporters`) keep working. Names in those arrays
  that match no directory brand are left alone and keep showing.
- On `supporters`: the brand-level `status`, `tier`, `support_year`, amounts and the
  Brand Tracker outreach columns stop being shown or edited. Columns are not dropped.

## Admin screens

- **Sponsors & partners (directory)**: list with logo, name, contact person + email,
  "Joined: N events" (Yes count). Filters by status/tier removed. Brand form keeps
  identity, contact, letters and website fields; drops status, tier, amounts, outreach.
  Brand page adds an "Events" history card.
- **Event → Brands**: own page linked from the event page header next to RSVPs
  (`/events/<id>/brands`), as in the mockup: counts, "+ Invite brands" (search/pick
  from the directory, choose role), table with tick boxes, invite letter + email status,
  reply, giving, and an edit drawer/row for the per-event fields. "Send letter to
  ticked" opens the existing send page with those brands and the event.
- **Guest list**: the Sponsors and Partners groups are removed; a short note points to
  the event Brands tabs.
- Follows the existing admin look (`admin.css` tokens, chips, tables, phone layout).

## Constraints

- Next.js 16 app router, server actions, `sql()` from `app/lib/db.js`; tests with
  `node --test` (`npm test`); additive migrations run at build.
- Staging first; push to main only when the owner says so; never test against production.
- Permissions: reuse the existing supporter and letter capabilities.
- Keep `CLAUDE.md` notes current.

## Settled after the builder check (coordinator's calls, owner to confirm on reading)

1. **Public gate.** `isPublic` no longer looks at brand status. A brand shows on the
   home page when: show on site + logo + blurb + said **Yes** to at least one published
   event. A brand ticked "show" but with no Yes anywhere stops showing. Before shipping,
   list any brand that would disappear and tell the owner.
2. **Event lists.** The event page, share text and home page read the Yes brands from
   `event_brands` (no 8-name cap). `events.partners` / `events.sponsors` keep only names
   that aren't in the directory (hand-typed); the event form field stays for those. The
   backfill moves matched names into `event_brands` and leaves the arrays unchanged, and
   readers skip array names that match a directory brand, so nothing shows twice.
3. **Numbers, tiers, amounts.** Tiers are dropped from the admin (already gone from the
   public page). A brand's HOR number is issued the first time it says Yes to an event
   (it still needs its 4-letter code; the Yes save asks for it if missing). Home-page totals
   come from Yes rows of `event_brands` for the latest year, and only rows ticked
   "OK to show amounts" (new per-event field, default off) count.
4. **Backfill.** Names are trimmed and compared case-insensitively; all events of any
   status; any brand status. Names that match no brand are listed in the build output
   and in the owner's report.
5. **Letters.** Sending a letter to a brand from its directory page still works
   (`event_id` null). From the event, the event's blanks fill in from that event; brand
   blanks are unchanged.
6. **Permissions.** Viewing the Brands tab needs `events:view` + `supporters:view`; editing
   replies and giving needs `supporters:edit`; sending needs `letters:edit`.

## Left to the builder

- Exact component split, the invite picker's interaction, and the per-row edit UI.
- How the send page receives the event (query param) and fills event blanks.
- Whether totals on the home page come from `event_brands` (Yes rows, by year).
