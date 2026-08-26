# House of Retrievers

A private interactive concept site for House of Retrievers, a nonprofit community of responsible Golden Retriever and Labrador owners. The experience centers on responsible pet ownership, volunteerism, community outreach, and activities for a cause.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
```

The build creates the deployment bundle under `dist/`, including the static client, worker entrypoint, and Sites metadata.

## Current experience

- Responsive one-page design with scroll progress and animated hero treatment
- Interactive purpose and activity stories
- How-to-join and founding-family views
- Prototype Join the Pack modal
- House of Retrievers brand palette: `#0D0D0D`, `#A78440`, warm ivory, and taupe
- Exact supplied two-dog silhouette logo in original and reversed formats

## Important content note

The join form is a prototype and does not send submissions. Activity photography and some organization details are placeholders until verified House of Retrievers content is supplied.

## Project structure

- `app/page.jsx` — page content, interactions, and prototype form
- `app/globals.css` — responsive layout and brand tokens
- `public/house-of-retrievers-logo-original.png` — exact supplied artwork
- `public/house-of-retrievers-logo-reverse.png` — contrast-safe dark-background version
- `scripts/create-reversed-logo.py` — deterministic reversed-logo generator
- `scripts/export-to-dist.mjs` — static deployment packaging
- `scripts/static-worker.js` — static asset worker entrypoint

See `CLAUDE.md` for refactoring constraints and recommended next work.
