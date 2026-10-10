import test from "node:test";
import assert from "node:assert/strict";
import { INCOMING_TRANSFORMATION, eventFolder, photoUrl, signParams } from "./cloudinary.mjs";

test("signature matches Cloudinary's documented example", () => {
  const params = { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 };
  assert.equal(signParams(params, "abcd"), "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("empty params are left out of the signature, and order doesn't matter", () => {
  assert.equal(signParams({ b: "2", a: "1", c: "" }, "s"), signParams({ a: "1", b: "2" }, "s"));
});

test("addresses", () => {
  assert.equal(eventFolder("abc"), "hor/events/abc");
  assert.equal(photoUrl("demo", "hor/events/abc/x1", 800), "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/hor/events/abc/x1");
  assert.match(INCOMING_TRANSFORMATION, /^c_limit,w_2000,h_2000/);
});
