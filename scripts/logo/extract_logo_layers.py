"""Rebuild the animated logo's layers from the supplied logo PNGs.

Run from the repo root after the logo artwork changes:

    pip install pillow numpy scipy scikit-image imagequant
    python3 scripts/logo/extract_logo_layers.py

It rewrites GOLDEN_PATH and LAB_PATH in app/lib/logoMomentsRig.mjs and the two
wordmark PNGs in public/. The rig polygons (pivots, cuts, clips) are kept as
they are; check them against the new artwork if the dogs moved.

How the layers are separated
- The reverse PNG has only two inks inside the dogs: retriever gold and white.
  Every dog pixel is a blend of those two over transparency, so projecting its
  colour onto the gold-white line gives how much of it is Golden and how much
  is Labrador. Each coverage map is traced at 50%, which is where the
  anti-aliased edge of the original sits.
- The Golden sits in front. The Labrador path is extended a few pixels under
  her, and under her tail, so the shared edge has no seam and a tail wag
  uncovers Labrador instead of a hole.
- The wordmark starts at x=595 and the dogs end at x=556, so the wordmark PNGs
  are the supplied PNGs with everything left of x=576 cleared.
"""

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure
from skimage.draw import polygon as draw_polygon

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
RIG = ROOT / "app" / "lib" / "logoMomentsRig.mjs"
GOLD = np.array([173, 131, 48.0])  # #AD8330, the supplied artwork's gold
WHITE = np.array([242, 242, 242.0])  # #F2F2F2, the reverse artwork's Labrador
WORDMARK_START_X = 576


def coverage_maps():
    rgba = np.array(Image.open(PUBLIC / "house-of-retrievers-logo-reverse.png").convert("RGBA")).astype(float)
    alpha, rgb = rgba[..., 3] / 255, rgba[..., :3]
    axis = GOLD - WHITE
    gold_share = np.clip(((rgb - WHITE) @ axis) / (axis @ axis), 0, 1)
    gold, lab = alpha * gold_share, alpha * (1 - gold_share)
    gold[:, WORDMARK_START_X:] = 0
    lab[:, WORDMARK_START_X:] = 0
    return keep_largest(gold), keep_largest(lab)


def keep_largest(cov):
    mask = cov > 0.5
    labels, count = ndi.label(mask)
    sizes = ndi.sum(mask, labels, range(1, count + 1))
    largest = labels == (np.argmax(sizes) + 1)
    return cov * ndi.binary_dilation(largest, iterations=2)


def complete_lab(gold, lab):
    gold_inside = ndi.binary_erosion(gold > 0.5, iterations=1)
    under_golden = ndi.binary_dilation(lab > 0.5, iterations=6) & gold_inside
    rows, cols = draw_polygon([483, 483, 519, 519], [335, 419, 419, 335], gold.shape)
    under_tail = np.zeros_like(gold_inside)
    under_tail[rows, cols] = True
    under_tail &= ndi.binary_dilation(gold > 0.3, iterations=2)
    under_tail[518:] = False  # stay above the ground line
    return np.maximum(lab, (under_golden | under_tail).astype(float))


def trace(cov, tolerance=0.3):
    out = ""
    for contour in measure.find_contours(np.pad(cov, 1), 0.5):
        contour = contour - 1
        y, x = contour[:, 0], contour[:, 1]
        if 0.5 * abs(np.dot(y, np.roll(x, 1)) - np.dot(x, np.roll(y, 1))) < 15:
            continue
        points = measure.approximate_polygon(contour, tolerance)[:-1]
        coords = [f"{px:.1f} {py:.1f}".replace(".0 ", " ") for py, px in points]
        coords = [c[:-2] if c.endswith(".0") else c for c in coords]
        out += "M" + coords[0] + "L" + " ".join(coords[1:]) + "Z"
    return out


def write_wordmarks():
    for variant in ("original", "reverse"):
        rgba = np.array(Image.open(PUBLIC / f"house-of-retrievers-logo-{variant}.png").convert("RGBA"))
        rgba[:, :WORDMARK_START_X] = 0
        rgba[rgba[..., 3] == 0] = 0
        image = Image.fromarray(rgba)
        try:
            import imagequant

            image = imagequant.quantize_pil_image(image, dithering_level=1.0, max_colors=128, min_quality=80, max_quality=98)
        except ImportError:
            pass
        image.save(PUBLIC / f"house-of-retrievers-wordmark-{variant}.png", optimize=True)


def main():
    gold, lab = coverage_maps()
    paths = {"GOLDEN_PATH": trace(gold), "LAB_PATH": trace(complete_lab(gold, lab))}
    source = RIG.read_text()
    for name, d in paths.items():
        source = re.sub(rf'export const {name} =\n  "[^"]*";', f"export const {name} =\n  {json.dumps(d)};", source)
    RIG.write_text(source)
    write_wordmarks()
    print({name: len(d) for name, d in paths.items()})


if __name__ == "__main__":
    main()
