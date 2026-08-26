# Claude Code handoff

## Product goal

Refactor and continue the House of Retrievers concept site without changing its approved brand direction. The primary visitor action is joining the community as a member, volunteer, or partner.

## Non-negotiable brand constraints

- Preserve the exact supplied two-dog silhouette logomark. Do not redraw, reinterpret, or replace either dog.
- Keep the icon on the left and the complete text mark on the right.
- The header and footer use `public/house-of-retrievers-logo-reverse.png` so the Labrador, wordmark, paw, and lines remain readable on dark surfaces.
- The Golden Retriever stays in the original brand gold.
- Primary palette: near-black `#0D0D0D`, retriever gold `#A78440`, white, warm ivory, and restrained taupe.
- Maintain accessible contrast and respect `prefers-reduced-motion`.

## Current implementation

- Next.js 15 App Router with React 19
- Static export packaged into `dist/client`
- Production worker entrypoint at `dist/server/index.js`
- All page behavior currently lives in `app/page.jsx`
- Styling currently lives in `app/globals.css`
- No backend, CMS, analytics, or form submission is connected

## Recommended refactor

1. Split `app/page.jsx` into reusable `Header`, `Hero`, `PurposeStories`, `Pack`, `JoinModal`, and `Footer` components.
2. Move editable activities and founding-family entries into a typed content module.
3. Preserve the current three-section information architecture and primary Join the Pack CTA.
4. Replace sample photography only with approved House of Retrievers assets and meaningful alt text.
5. Connect the join form only after the submission destination, privacy copy, and consent requirements are confirmed.
6. Keep the existing ChatGPT Sites packaging scripts working unless deployment is intentionally migrated.

## Verification

Run:

```bash
npm install
npm run build
```

Confirm desktop and mobile header/footer logo legibility, story switching, pack-view tabs, modal open/close behavior, form success state, keyboard focus, and reduced-motion behavior.
