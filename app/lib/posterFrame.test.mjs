import { test } from "node:test";
import assert from "node:assert/strict";
import { isPosterSize, posterPath, posterVersion, posterWindow, withPoster } from "./posterFrame.mjs";

const id = "0d6a3b0c-1111-4222-8333-944455556666";

test("4:5 pictures count as posters; 16:10 and 2:3 don't", () => {
  assert.equal(isPosterSize(1200, 1500), true);
  assert.equal(isPosterSize(1638, 2048), true);
  assert.equal(isPosterSize(1600, 1000), false);
  assert.equal(isPosterSize(1308, 2000), false);
  assert.equal(isPosterSize(0, 0), false);
});

test("the 4:5 window is as large as fits, centred on the old crop, inside the picture", () => {
  assert.deepEqual(posterWindow(1308, 2000), { left: 0, top: 183, width: 1308, height: 1635 });
  assert.deepEqual(posterWindow(1600, 1000, { x: 0.9, y: 0.5 }), { left: 800, top: 0, width: 800, height: 1000 });
  assert.deepEqual(posterWindow(1600, 1000, { x: 0.1, y: 0.5 }), { left: 0, top: 0, width: 800, height: 1000 });
});

test("the poster address changes when the cover, original or framing changes", () => {
  const row = { id, image: "/api/event-image/a", image_source: "/api/event-image/b", image_crop: { x: 0.5, y: 0.5 } };
  const v = posterVersion(row);
  assert.equal(posterVersion({ ...row }), v);
  assert.notEqual(posterVersion({ ...row, image: "/api/event-image/c" }), v);
  assert.notEqual(posterVersion({ ...row, image_source: null }), v);
  assert.notEqual(posterVersion({ ...row, image_crop: { x: 0.4, y: 0.5 } }), v);
  assert.equal(posterPath(row), `/api/event-poster/${id}?v=${v}`);
  assert.equal(posterPath({ ...row, image: "" }), "");
  assert.equal(posterPath({ ...row, id: "not-an-id" }), "");
});

test("the card, share image and event page all show the 4:5 poster; extra photos stay", () => {
  const row = { id, image: "/crop", image_source: "/full" };
  const event = { image: "/crop", media: [{ src: "/full", alt: "Poster", fit: "fit" }, { src: "/two", alt: "Venue", fit: "fill" }] };
  const shown = withPoster(event, row);
  assert.equal(shown.image, posterPath(row));
  assert.deepEqual(shown.media, [{ src: posterPath(row), alt: "Poster", fit: "fit" }, { src: "/two", alt: "Venue", fit: "fill" }]);
  assert.equal(withPoster({ media: [{ src: "/two" }] }, { id, image: "" }).media[0].src, "/two");
});
