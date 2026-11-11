import test from "node:test";
import assert from "node:assert/strict";
import { DISPLAY_SECONDS, MAX_QUEUE, QUEUED_SECONDS, enqueue, holdSeconds } from "./checkinDisplay.mjs";

test("a welcome stays 10 s alone, 5 s when others are waiting", () => {
  assert.equal(DISPLAY_SECONDS, 10);
  assert.equal(holdSeconds(0), 10);
  assert.equal(holdSeconds(2), QUEUED_SECONDS);
});

test("arrivals queue oldest first, once each, capped", () => {
  const seen = new Set(["a"]);
  const q = enqueue([], [{ id: "c", at: "2026-11-30T07:00:03Z" }, { id: "a", at: "2026-11-30T07:00:00Z" }, { id: "b", at: "2026-11-30T07:00:01Z" }], seen);
  assert.deepEqual(q.map((x) => x.id), ["b", "c"]);
  assert.deepEqual(enqueue(q, [{ id: "b", at: "x" }], seen).map((x) => x.id), ["b", "c"]);
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, at: `2026-11-30T07:01:${String(i).padStart(2, "0")}Z` }));
  const capped = enqueue([], many, new Set());
  assert.equal(capped.length, MAX_QUEUE);
  assert.equal(capped.at(-1).id, "n19");
});

test("display background: chosen kind, black & gold without a picture", async () => {
  const { cleanDisplayBg, displayBackground } = await import("./checkinDisplay.mjs");
  assert.equal(cleanDisplayBg("ivory"), "ivory");
  assert.equal(cleanDisplayBg("neon"), "dark");
  assert.deepEqual(displayBackground({ bg: "poster", poster: "/p.jpg" }), { kind: "poster", image: "/p.jpg" });
  assert.deepEqual(displayBackground({ bg: "poster" }), { kind: "dark", image: "" });
  assert.deepEqual(displayBackground({ bg: "image", image: "/api/event-image/x" }), { kind: "image", image: "/api/event-image/x" });
  assert.deepEqual(displayBackground({ bg: "ivory", image: "/x" }), { kind: "ivory", image: "" });
});

test("display image notes: 16:9 at full HD fits, others explain the problem", async () => {
  const { displayImageNotes } = await import("./checkinDisplay.mjs");
  assert.deepEqual(displayImageNotes({ width: 1920, height: 1080 }), []);
  assert.deepEqual(displayImageNotes({ width: 3840, height: 2160 }), []);
  assert.match(displayImageNotes({ width: 1080, height: 1350 })[0], /taller than 16:9.*top and bottom/);
  assert.match(displayImageNotes({ width: 2400, height: 800 })[0], /wider than 16:9.*sides/);
  const small = displayImageNotes({ width: 960, height: 540 });
  assert.equal(small.length, 1);
  assert.match(small[0], /at least 1280 × 720, ideally 1920 × 1080/);
});
