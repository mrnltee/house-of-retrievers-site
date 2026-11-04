# Email template builder for brand invites — design (4 Nov 2026)

## Why

Sponsorship invites go out from an event's Brand tracker either as a short cover email with
the letter attached as a PDF, or (since 4 Nov) as the letter written into the email. Both use
a fixed email frame. The owner wants designed emails: an editor for the header, body and
footer, with backgrounds, spacing, images, alignment, text formatting and columns, and a set
of template types for brand outreach under an event, with or without the PDF attachment.

## Decided with the owner (4 Nov 2026)

- **Template types, all in the first build:**
  1. Invite — cover email (letter attached as PDF)
  2. Invite — full email (the whole invite in the email, no attachment)
  3. Follow-up (brands with no reply yet; PDF optional)
  4. Thank you for saying yes (next steps)
  5. Thank you anyway (for a No)
- **Header and footer are shared:** HOR's header and footer are edited once and used by every
  template. A template can switch to its own header and/or footer.
- **Library plus event copies:** templates live in a library (Email templates). An event can
  make its own copy (as with Letters), so one event's changes don't touch others.
- **Editor:** three zones (Header, Body, Footer), each a list of blocks — Text, Image,
  Columns (2 or 3), Button, Divider, Space. Every block and zone has: background colour (typed
  as hex, RGB or HSL), padding, margin (space around) and alignment (left/centre/right).
  Text: bold, italic, underline, link, size, colour, bullet/numbered lists; Enter = new
  paragraph, Shift+Enter = new line. Images upload like other admin images and scale with a
  width control. Live preview (desktop and phone) and "Send a test to me".
- Mockup shown in chat and accepted as the direction.

## Goals

1. Admins build and edit brand-outreach email templates in a block editor with the styles above.
2. One shared HOR header and footer (logo band; name, SEC registration, website), editable once.
3. The five template types exist as ready-made starters, each editable and copyable per event.
4. From the Brand tracker's send page, an admin picks a template; "Attach the letter as a PDF"
   keeps working. The chosen template's body replaces the cover note (PDF on) or the letter
   text (PDF off), and fill-ins ([Salutation], [Company Name], [Event Name], [Event Date] …)
   fill in per brand.
5. Sends are logged exactly as today (letter_sends, Brand tracker status).

## Non-goals

- No drag-and-drop canvas; blocks are moved with up/down controls.
- No custom fonts (email-safe fonts only), no animated content, no forms inside emails.
- No change to the existing RSVP/Join email templates (they keep their current editor).
- No automatic follow-up sending or scheduling; sending stays a manual, ticked action.
- No reply-tracking links (parked on 3 Nov).

## Anti-goals (a failure even if it works)

- An email that looks right in the preview but breaks in Gmail or Outlook.
- Pasted or typed content that can run scripts or load hidden content (all HTML is cleaned).
- Anything emailed without an admin ticking brands and confirming the send.
- Losing or changing existing letters, email templates or send history; migrations that drop
  or rewrite data. Testing against production.

## Constraints

- Next.js 16 app router, server actions, `sql()` from `app/lib/db.js`; tests with `node --test`.
- Additive migrations only; staging first; push to main only on the owner's word.
- Emails are table-based HTML with inline styles (as `emailTemplates.mjs` builds today).
  Margin is rendered as outer spacing (padding on a wrapper cell), because many email apps
  ignore CSS margin. Colours typed as RGB/HSL are stored and sent as hex.
- Images go through the existing Cloudinary upload; sent with absolute https URLs.
- Admin rules: submit buttons use ConfirmButton; other buttons `data-confirm="not-needed-read-only"`.
- Permissions: editing templates needs `letters:edit`; sending as today.

## Data (proposal)

- New table `email_designs`: `id`, `name`, `kind` (invite-cover, invite-full, follow-up,
  thanks-yes, thanks-no), `subject`, `doc` (jsonb: `{ header, body, footer, useHousewideHeader,
  useHousewideFooter }`, each zone `{ style, blocks[] }`), `event_id` (null = library),
  `based_on` (the library template an event copy came from), `created_by/at`, `updated_by/at`.
- New row (or settings key) for the shared header and footer: `{ header, footer }` zones.
- `letter_sends` gains nothing: sends still log the letter key; a nullable `design_id` column
  records which email design was used.

## Left to the builder (engineering calls, Jarvs/ENG-LEAD)

- The text editor: an in-house contentEditable limited to the listed formatting, with a
  sanitiser that keeps only allowed tags and attributes (recommended over adding an editor
  package). Pasted Word/Google Docs content is reduced to the allowed formatting.
- Exact block JSON shape, the renderer (blocks → email HTML and plain text), and how the
  preview reuses the same renderer.
- The starters' wording for the five types (owner can edit after).

## Open items

- None blocking. The builder check was done by the coordinator (no separate reviewer was
  spawned); calls made are marked above as engineering calls.
