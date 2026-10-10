# Brand artwork (source files)

The supplied logo artwork, October 2026: "The House of Retrievers Society Inc."
Kept here as the source of truth. This folder is not served by the site.

- `THOR_SVGLogoHZLGT.svg`: horizontal, for light surfaces (near-black Labrador and wordmark)
- `THOR_SVGLogoHZDRK.svg`: horizontal, for dark surfaces (off-white Labrador and wordmark)
- `THOR_SVGLogoVTLGT.svg` / `THOR_SVGLogoVTDRK.svg`: stacked versions, not used on the site yet

Inks in the artwork: gold `#AD8330`, Labrador `#0D0D0D` (light) / `#F2F2F2` (dark).

The site uses PNGs rendered from the horizontal SVGs at 1396 px wide, placed 4 px
down in the 1396 x 564 canvas the logo has always used:
`public/house-of-retrievers-logo-original.png` (light) and `-reverse.png` (dark).
After replacing them, run `python3 scripts/logo/extract_logo_layers.py` to
retrace the animated dogs and rebuild the wordmark-only PNGs.

The dogs in this artwork are the same silhouettes as before, each about 1.2x
larger and the Labrador closer to the Golden. The animation rig in
`app/lib/logoMomentsRig.mjs` and the intro cut-outs in `globals.css` were moved
with each dog by the transform that lays the old silhouette on the new one
(99.6% overlap), so the moving parts still sit on the same joints.
