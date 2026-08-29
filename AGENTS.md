# Codex handoff

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
- Deployed on Vercel as a Next.js server app. The old static export to `dist/client` and its worker entrypoint were retired once server routes were needed.
- Page composition lives in `app/page.jsx`; sections are components in `app/components/`
- Editable content lives in `app/content/` (`activities.js`, `families.js`, `join.js`)
- Styling lives in `app/globals.css`
- Server routes in `app/api/`: `instagram` (feed proxy) and `join` (form intake)
- Secrets stay server-side and are managed in Vercel. Pull them locally with `npx vercel env pull .env.local`. Never expose them via `NEXT_PUBLIC_`.

## Refactor status

1. Done — `app/page.jsx` is split into `Header`, `Hero`, `PurposeStories`, `InstagramFeed`, `Pack`, `FinalCta`, `JoinModal`, and `Footer` under `app/components/`.
2. Done — activities, founding families, and join copy live in `app/content/`, documented with JSDoc typedefs. The repo is plain JSX; confirm with the owner before introducing TypeScript.
3. Preserve the current information architecture and primary Join the Pack CTA.
4. Open — one stock photo remains: the "Better humans for better dogs" story image in `app/content/activities.js`, plus the `images.unsplash.com` preconnect in `app/layout.jsx` that serves it. Drop the approved photo into `public/2-better/` and remove the preconnect. The hero poster and the `.hero-photo` fallback were replaced with frames taken from the hero video itself.
5. Done — the join form posts to `app/api/join/route.js`, which forwards to Google Apps Script with `JOIN_FORM_SECRET` in the request body so the secret never reaches the browser. Verified end to end in production. The field names are a contract with `scripts/apps-script/Code.gs`: the payload nests under `submission` and uses `joinType`, `socialProfile`, and `furbabyName`. Rename in one place and submissions are silently rejected, so change both together and redeploy the script.
6. Retired — the ChatGPT Sites packaging scripts were removed after the deployment moved to Vercel.

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
