# Email template builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block-based email designs (header/body/footer) for brand outreach, five starter types, shared HOR header/footer, library + event copies, usable from the letter send page with or without the PDF.

**Architecture:** A pure module `app/lib/emailDesign.mjs` owns the document shape, colour parsing, HTML cleaning, validation, fill-ins and rendering to email-safe table HTML; the editor preview and the server send use the same renderer. Designs are rows in `email_designs` (jsonb `doc`); the shared header/footer is the single row with `kind = 'house'`. The send action renders the chosen design per recipient instead of the cover / letter email.

**Tech Stack:** Next.js 16 server actions, `sql()` (`app/lib/db.js`), `node --test`, plain React client components (no new packages).

**Spec:** docs/superpowers/specs/2026-11-04-email-template-builder-design.md

## Global Constraints

- No new npm packages; in-house contentEditable + regex sanitiser (ENG-LEAD call in spec).
- Email HTML: tables + inline styles; margin rendered as padding on an outer cell; colours sent as `#rrggbb`.
- Additive migration only (`db/migrations/086_email_designs.sql`); nothing dropped or rewritten.
- Kinds: `invite-cover`, `invite-full`, `follow-up`, `thanks-yes`, `thanks-no` (plus `house` for the shared header/footer row).
- Blocks: `text`, `image`, `columns` (2 or 3), `button`, `divider`, `space`. Style on every block and zone: `background`, `padding` [t,r,b,l], `margin` [t,r,b,l], `align` (`left|center|right`).
- Admin rules: submits via ConfirmButton; other buttons `data-confirm="not-needed-read-only"`. Edit needs `letters:edit`.
- Images: stored in `event_images`, referenced as `/api/event-image/<uuid>`, sent as `${HOME_URL}/api/event-image/<uuid>`.
- Nothing is emailed except: the send page (ticked + confirmed) and "Send a test to me" (to the signed-in admin only).

## Review Focus

1. Pasted rich text (Word/Google Docs, `<script>`, `onerror=`, `javascript:` links, `style` with `expression`/`url(`) → only allowed tags/attrs survive. (Task 1 tests.)
2. Fill-in values containing `<`, `&`, quotes → escaped in HTML, plain in text. (Task 2 test.)
3. A design whose header/footer use the house row while the house row doesn't exist yet → default HOR header/footer used. (Task 2 test.)
4. Colour input like `rgb(300, 0, 0)`, `hsl(400 50% 50%)`, `#abc`, `gold` → clamped/expanded or rejected with a message, never broken CSS. (Task 1 test.)
5. A send with a design chosen whose text has fill-ins not in the letter → the send page asks for them and the action refuses when missing. (Task 6 test.)

---

### Task 1: Colours, HTML cleaning, document validation

**Files:** Create `app/lib/emailDesign.mjs`, `app/lib/emailDesign.test.mjs`

**Interfaces — Produces:**
- `toHex(value: string) -> string` (`"#rrggbb"`, or `""` when not a colour). Accepts `#rgb`, `#rrggbb`, `rgb(r,g,b)`, `hsl(h,s%,l%)` (commas or spaces); clamps channels.
- `cleanHtml(html: string) -> string`: keeps `p br strong b em i u a ul ol li span`; `a` keeps `href` only when `http(s):`/`mailto:` (adds `target="_blank"`); `span` keeps `style` with only `color` (→ hex) and `font-size` (12–40px). Everything else unwrapped; text escaped; `<b>`→`<strong>`, `<i>`→`<em>`, `<div>`→`<p>`.
- `cleanDoc(doc) -> { doc } | { error }`: zones `header|body|footer` each `{ style, blocks }`; flags `ownHeader`, `ownFooter`; numbers clamped (padding/margin 0–80, image width 10–100 %, text size 12–40); ≤ 40 blocks per zone; image `src` must match `^/api/event-image/[0-9a-f-]{36}$` or `^https://`; button `href` http(s)/mailto.
- `KINDS: [key, label, hint, attachDefault][]` with the five kinds.

- [ ] Step 1: tests `toHex` (`"#abc"→"#aabbcc"`, `"rgb(300,0,-5)"→"#ff0000"`, `"hsl(120 100% 25%)"→"#008000"`, `"gold"→""`); `cleanHtml` (script/onerror/javascript:/style url( removed; `<b>x</b>`→`<strong>x</strong>`; span color rgb→hex kept; font-size 99px dropped); `cleanDoc` (unknown block type → error naming it; padding 500→80; bad image src → error).
- [ ] Step 2: run `node --test app/lib/emailDesign.test.mjs` → FAIL (module missing).
- [ ] Step 3: implement.
- [ ] Step 4: run → PASS. Step 5: commit.

### Task 2: Renderer, fill-ins, starters, house default

**Files:** Modify `app/lib/emailDesign.mjs`, its test.

**Interfaces — Produces:**
- `HOUSE_DEFAULT: { header, footer }` (black logo band using the existing email header image; footer: org name bold, `SEC Registration: ${LEGAL.sec}`, website link, "Reply to this email to reach the team.").
- `STARTERS: Record<kind, { name, subject, doc }>` — wording for the five kinds using `[Salutation]`, `[Company Name]`, `[Event Name]`, `[Event Date]`, `[Event Time]`, `[Event Location]`; invite-cover includes "Our letter is attached as a PDF."; invite-full includes a 2-column date/venue block and a Portfolio button (`https://canva.link/hor`).
- `designTexts(doc, subject) -> string[]` (all text html, button labels/hrefs, alt texts, subject) for `blanksOf`.
- `fillDesign(doc, subject, fill: (text, {html}) => string) -> { doc, subject }`.
- `renderDesign(doc, { house, subject, preheader }) -> { subject, html, text }`; uses `house` zones unless `doc.ownHeader/ownFooter`; images get absolute `${HOME_URL}` URLs; 560px card; columns stack on phones via a `<style>` media query with `.ed-col{display:block!important;width:100%!important}`.

- [ ] Step 1: tests — render contains `#F5F1E6` when a zone background is that; margin becomes padding on wrapper td; columns produce 2 `td.ed-col`; house footer shows SEC number when `ownFooter` false and doc footer ignored; `ownFooter` true uses doc footer; fill escapes `<b>&` in html and not in text; image src absolute.
- [ ] Step 2–4: fail, implement, pass. Step 5: commit.

### Task 3: Migration, store, actions

**Files:** Create `db/migrations/086_email_designs.sql`, `app/lib/emailDesignStore.js`, `app/admin/emailDesignActions.js`.

- Table `email_designs(id uuid pk, kind text check (kind in five + 'house'), name text 1–80, subject text ≤150, doc jsonb not null, event_id uuid null references events on delete cascade, based_on uuid null, created_by, created_at, updated_by, updated_at)`; unique partial index one `house` row; `ALTER TABLE letter_sends ADD COLUMN IF NOT EXISTS design_id uuid`.
- Store: `listDesigns({ eventId = null, withLibrary = true })`, `loadDesign(id)`, `loadHouse() -> {header, footer}` (HOUSE_DEFAULT when no row).
- Actions (all `letters:edit`, `guarded`, `logActivity`): `createDesign(data)` (kind starter, or `from` copy; optional `event` → `event_id`, `based_on`), `saveDesign(data)` (fields `id,name,subject,doc` JSON → `cleanDoc`), `deleteDesign(data)`, `saveHouse(data)`, `uploadDesignImage(dataUrl) -> {src}|{error}` (same checks as brand logos, 5 MB), `sendDesignTest(data)` (renders with sample fills, sends to `admin.email` only).
- [ ] Steps: write migration; implement; `npm test` green; commit.

### Task 4: Library page and editor

**Files:** Create `app/admin/(app)/emails/designs/page.jsx`, `app/admin/(app)/emails/designs/[id]/page.jsx`, `.../[id]/DesignEditor.jsx`, `.../[id]/RichText.jsx`, `.../[id]/StyleFields.jsx`; Modify `app/admin/(app)/emails/page.jsx` (link card), `app/admin/admin.css`.

- Library: list by kind (name, subject, updated), "+ New" per kind, Duplicate, Delete, "HOR header & footer" (opens the house row in the same editor with only header/footer zones).
- Editor: left = zones with block list (add, up/down, delete, select); middle = StyleFields for the selected block/zone (background text input + swatch + format toggle Hex/RGB/HSL that shows the converted value, padding/margin 4 inputs, align segmented, columns 2/3, image width slider, button label/href/colours); RichText edits text blocks (toolbar: bold, italic, underline, link, bullet, numbered, colour, size; Enter/Shift+Enter native; paste → plain-ish via `cleanHtml`); right = preview iframe (`srcDoc` from `renderDesign`) with Desktop/Phone width toggle. Save posts `doc` JSON via ConfirmButton; "Send a test to me". Unsaved-changes warning (beforeunload).
- [ ] Steps: build; `npx next build` passes; commit.

### Task 5: Event copies

**Files:** Modify `app/admin/(app)/events/[id]/letters/page.jsx`.

- Section "Email designs for this event": this event's copies (open/delete) + form "Make a copy for this event" (select library design) → `createDesign` with `event`.
- [ ] Steps: build; commit.

### Task 6: Send with a design

**Files:** Modify `app/admin/(app)/letters/send/page.jsx`, `.../send/LetterSend.jsx`, `app/admin/letterActions.js`, `app/lib/letterSendsStore.js`; test in `app/lib/emailDesign.test.mjs`.

- Send page loads `listDesigns({ eventId })` (event copies first) and `loadHouse()`; LetterSend: select "Email design" (`""` = HOR standard, as today); blanks = `blanksOf(subject, cover, body, ...designTexts(design))`; preview uses `renderDesign(fillDesign(...))` when chosen.
- `sendLetters`: `design` id → load; per recipient `fillDesign` with the same fill-in values as the letter (escaped for html) → `renderDesign`; attach PDF when `attach` on; subject = design subject when set else letter subject; `logSend({ …, designId })`.
- Test: `fillDesign` + `blanksOf` — a design with `[Booth Size]` adds that blank; refusing when missing is covered by existing `missingBlanks`.
- [ ] Steps: test fail → implement → pass; build; commit.

### Task 7: Verify and hand over

- [ ] `npm test` and `npx next build` green; push `staging`; wait for READY; log in office LOG.md and record; report to owner (not on main).
