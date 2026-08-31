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
4. Done — every image is now an approved House of Retrievers asset with alt text describing what is actually in the frame. The Unsplash preconnect is gone. Story photos live in `public/1-purpaws/purpaw[n].jpg` and `public/2-better/better[n].jpg`; add to a gallery by dropping the next number in the folder and appending an entry in `app/content/activities.js`.
5. Done — the join form posts to `app/api/join/route.js`, which forwards to Google Apps Script with `JOIN_FORM_SECRET` in the request body so the secret never reaches the browser. Verified end to end in production. The field names are a contract with `scripts/apps-script/Code.gs`: the payload nests under `submission` and uses `joinType`, `socialProfile`, `socialUrl`, and `furbabyName`. `socialUrl` is what makes the sheet cell a clickable link. Rename in one place and submissions are silently rejected, so change both together and redeploy the script.
6. Retired — the ChatGPT Sites packaging scripts were removed after the deployment moved to Vercel.

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
