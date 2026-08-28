# House of Retrievers

A private interactive concept site for House of Retrievers, a nonprofit community of responsible Golden Retriever and Labrador owners. The experience centers on responsible pet ownership, volunteerism, community outreach, and activities for a cause.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Agent tooling

The repository includes MCP configuration for Next.js tooling, browser diagnostics,
GitHub, and current library documentation:

- Codex loads the project-specific Next.js server from `.codex/config.toml` and
  merges it with MCP servers configured in the user's global Codex settings.
- MCP clients that support the shared `.mcp.json` format can load the complete
  project set from that file.
- Remote GitHub access may prompt for OAuth the first time it is used.

Restart your MCP client after cloning or after changing either configuration file.

## Production build

```bash
npm run build
```

The site is deployed on Vercel as a Next.js server app, so `/api/*` routes run at request time.

## Environment variables

Copy `.env.example` and fill in the values, or pull them from Vercel:

```bash
npx vercel env pull .env.local
```

| Variable | Purpose |
| --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | Web App `/exec` URL that records join submissions |
| `JOIN_FORM_SECRET` | Shared secret sent in the join request body |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API token for the feed |
| `INSTAGRAM_USER_ID` | Instagram account id |
| `INSTAGRAM_API_VERSION` | Graph API version |

All of these are read server-side only. Never prefix them with `NEXT_PUBLIC_`, and never commit `.env.local`.

## Current experience

- Responsive one-page design with scroll progress and animated hero treatment
- Interactive purpose and activity stories
- How-to-join and founding-family views
- Join the Pack modal wired to the join intake endpoint
- House of Retrievers brand palette: `#0D0D0D`, `#A78440`, warm ivory, and taupe
- Exact supplied two-dog silhouette logo in original and reversed formats

## Important content note

The join form posts to `/api/join`, which forwards submissions to a Google Apps Script endpoint. Some activity photography and organization details are still placeholders until verified House of Retrievers content is supplied.

## Project structure

- `app/page.jsx` — page composition and shared page-level state
- `app/components/` — `Header`, `Hero`, `PurposeStories`, `InstagramFeed`, `Pack`, `FinalCta`, `JoinModal`, `Footer`
- `app/content/` — editable activities, founding families, and join copy
- `app/api/` — `instagram` feed proxy and `join` form intake
- `app/globals.css` — responsive layout and brand tokens
- `public/house-of-retrievers-logo-original.png` — exact supplied artwork
- `public/house-of-retrievers-logo-reverse.png` — contrast-safe dark-background version
- `scripts/create-reversed-logo.py` — deterministic reversed-logo generator
- `scripts/apps-script/Code.gs` — Google Apps Script that records join submissions to a sheet

See `CLAUDE.md` for refactoring constraints and recommended next work.
