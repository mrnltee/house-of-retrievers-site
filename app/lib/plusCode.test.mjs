import test from "node:test";
import assert from "node:assert/strict";
import { decode, encode, findPlusCode, isFullCode, isShortCode, parseCoordinates, recoverNearest } from "./plusCode.mjs";

const near = (a, b, tol = 0.0002) => Math.abs(a - b) < tol;

test("decodes a known full code (Googleplex, 849VCWC8+R9)", () => {
  const { lat, lng } = decode("849VCWC8+R9");
  assert.ok(near(lat, 37.4221, 0.0006) && near(lng, -122.0844, 0.0006), `${lat},${lng}`);
});

test("encode and decode agree for a point in Makati", () => {
  const code = encode(14.5547, 121.0244);
  assert.ok(isFullCode(code));
  const { lat, lng } = decode(code);
  assert.ok(near(lat, 14.5547) && near(lng, 121.0244), `${code} → ${lat},${lng}`);
});

test("a short code recovers to the same spot from a nearby reference", () => {
  const full = encode(14.5547, 121.0244);
  const short = full.slice(4);
  assert.ok(isShortCode(short));
  const { lat, lng } = recoverNearest(short, 14.56, 121.03); // the middle of Makati, roughly
  assert.ok(near(lat, 14.5547) && near(lng, 121.0244), `${short} → ${lat},${lng}`);
});

test("finds the code in text the way Google Maps writes it", () => {
  assert.deepEqual(findPlusCode("H4XX+2V Makati, Metro Manila"), { code: "H4XX+2V", rest: "Makati, Metro Manila" });
  assert.deepEqual(findPlusCode("7q63h4xx+2v"), { code: "7Q63H4XX+2V", rest: "" });
  assert.equal(findPlusCode("Bonifacio High Street"), null);
});

test("rejects things that only look like codes", () => {
  assert.equal(isFullCode("ZZZZZZZZ+22"), false);
  assert.equal(isShortCode("H4XX2V"), false);
});

test("pasted coordinates", () => {
  assert.deepEqual(parseCoordinates("14.5547, 121.0244"), { lat: 14.5547, lng: 121.0244 });
  assert.equal(parseCoordinates("Makati"), null);
});
