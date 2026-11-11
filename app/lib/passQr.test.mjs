import test from "node:test";
import assert from "node:assert/strict";
import { COMP_QR_INK, QR_INK, compPassLine, contrastOnWhite, passQrInk } from "./passQr.mjs";

test("complimentary guests get the gold QR, everyone else black", () => {
  assert.equal(passQrInk("vip"), COMP_QR_INK);
  assert.equal(passQrInk(null), QR_INK);
  assert.equal(passQrInk("king"), QR_INK);
  assert.equal(compPassLine("organizer"), "Organizer · Complimentary");
  assert.equal(compPassLine(""), "");
});

test("the gold QR stays dark enough to scan", () => {
  assert.ok(contrastOnWhite(COMP_QR_INK) >= 5.5, `contrast ${contrastOnWhite(COMP_QR_INK)}`);
});

test("a complimentary guest's email QR is the gold one, labelled", async () => {
  const { passQrImage } = await import("./emailTemplates.mjs");
  const vip = passQrImage("7KQ2MPX4RT", "vip");
  assert.match(vip.src, /pass-qr\/7KQ2MPX4RT\?tone=comp$/);
  assert.match(vip.caption, /VIP · Complimentary/);
  const usual = passQrImage("7KQ2MPX4RT");
  assert.doesNotMatch(usual.src, /tone/);
  assert.doesNotMatch(usual.caption, /Complimentary/);
});
