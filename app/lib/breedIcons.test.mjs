import test from "node:test";
import assert from "node:assert/strict";
import { BREED_ICON_MAX_BYTES, checkBreedIconSvg, readBreedIconUpload } from "./breedIcons.mjs";

const svg = (inner, box = "0 0 64 64") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${inner}</svg>`;
const dataUrl = (mime, text) => `data:${mime};base64,${Buffer.from(text).toString("base64")}`;

test("a plain square SVG icon is accepted", () => {
  assert.deepEqual(checkBreedIconSvg(svg('<circle cx="32" cy="32" r="20" fill="#C98A4A"/>')), {});
});

test("SVGs that could run code or load other files are refused", () => {
  for (const bad of ['<script>alert(1)</script>', '<circle onload="alert(1)" r="2"/>', '<a href="javascript:alert(1)"><circle r="2"/></a>', '<foreignObject><div/></foreignObject>', '<image href="https://evil.example/x.png"/>', '<use href="http://x/y.svg#a"/>']) {
    assert.match(checkBreedIconSvg(svg(bad)).error, /can't be used/, bad);
  }
});

test("the icon must be square", () => {
  assert.match(checkBreedIconSvg(svg('<circle r="2"/>', "0 0 64 48")).error, /square/);
  assert.match(checkBreedIconSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="2"/></svg>').error, /square/);
  assert.deepEqual(checkBreedIconSvg(svg('<circle r="2"/>', "0 0 128 128")), {});
});

test("uploads: SVG, PNG or WebP within the size limit", () => {
  assert.equal(readBreedIconUpload(dataUrl("image/svg+xml", svg('<circle r="2"/>'))).value.mime, "image/svg+xml");
  assert.equal(readBreedIconUpload(dataUrl("image/png", "x")).value.mime, "image/png");
  assert.match(readBreedIconUpload(dataUrl("image/gif", "x")).error, /SVG, PNG or WebP/);
  assert.match(readBreedIconUpload("").error, /Pick an icon/);
  assert.match(readBreedIconUpload(dataUrl("image/png", "x".repeat(BREED_ICON_MAX_BYTES + 1))).error, /100 KB/);
  assert.match(readBreedIconUpload(dataUrl("image/svg+xml", svg("<script/>"))).error, /can't be used/);
});
