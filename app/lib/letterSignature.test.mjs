import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSignature, hasSignatureMark } from "./letterSignature.mjs";
import { letterBlocks } from "./letters.mjs";
import { letterPdf } from "./letterPdf.mjs";

// A 1×1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("signature settings are kept within range; only stored images count", () => {
  assert.deepEqual(cleanSignature({ on: "1", image: "/api/event-image/0b6f7c1e-1111-4222-8333-944445555666", x: 2, dy: -500, width: 10 }), { on: true, image: "/api/event-image/0b6f7c1e-1111-4222-8333-944445555666", x: 0.85, dy: -80, width: 60 });
  assert.equal(cleanSignature({ on: true, image: "https://evil.example/x.png" }).image, "");
  assert.equal(cleanSignature(null).on, false);
});

test("{signature} on its own line marks the place and takes no text", () => {
  assert.equal(hasSignatureMark("Sincerely,\n\n{signature}\n\n**Ms. A**"), true);
  assert.equal(hasSignatureMark("Sign {signature} here"), false);
  assert.deepEqual(letterBlocks("Sincerely,\n\n{signature}\n\n**Ms. A**").map((b) => b.type), ["p", "signature", "p"]);
});

test("the PDF draws with or without a signature", async () => {
  const blocks = letterBlocks("Sincerely,\n\n{signature}\n\n**Ms. A**");
  const plain = await letterPdf(blocks, { title: "T" });
  const signed = await letterPdf(blocks, { title: "T", signature: { buffer: PNG, x: 0.1, dy: -20, width: 120 } });
  assert.ok(plain.length > 1000);
  assert.ok(signed.length > plain.length, "the signed PDF carries the image");
  assert.match(signed.toString("latin1"), /\/Subtype \/Image/);
});

test("with no {signature} line, the signature goes above the signatory, else after the sign-off", async () => {
  const { placeSignatureMark } = await import("./letterSignature.mjs");
  assert.equal(placeSignatureMark("Hi.\n\nSincerely yours,\n\n**MS. ALYZZA ANGELES**\n**President**"), "Hi.\n\nSincerely yours,\n\n{signature}\n\n**MS. ALYZZA ANGELES**\n**President**");
  assert.equal(placeSignatureMark("Hi.\n\nSincerely,\n\nAna"), "Hi.\n\nSincerely,\n\n{signature}\n\nAna");
  assert.equal(placeSignatureMark("Hi.\n\n{signature}\n\nWarm regards,\n\n**[Signatory Name]**"), "Hi.\n\nWarm regards,\n\n{signature}\n\n**[Signatory Name]**");
});

test("a letter with the signature on but no {signature} line is still signed", async () => {
  const { prepareLetter } = await import("./letters.mjs");
  const letter = { name: "L", subject: "S", cover: "C", body: "Hi.\n\nSincerely yours,\n\n**MS. A**" };
  assert.ok(prepareLetter(letter, { name: "X", signed: true }).blocks.some((b) => b.type === "signature"));
  assert.ok(!prepareLetter(letter, { name: "X" }).blocks.some((b) => b.type === "signature"));
  const pdf = await letterPdf(prepareLetter(letter, { name: "X", signed: true }).blocks, { title: "T", signature: { buffer: PNG, x: 0, dy: -20, width: 120 } });
  assert.match(pdf.toString("latin1"), /\/Subtype \/Image/);
});

test("a large transparent PNG in several chunks (as browsers write them) comes out whole, not broken", async () => {
  const zlib = await import("node:zlib");
  const w = 900, h = 300, raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w * 4 + 1) + 1 + x * 4 + 3] = Math.abs(y - 150 - 90 * Math.sin(x / 40)) < 5 ? 255 : 0;
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const z = zlib.deflateSync(raw), parts = [];
  for (let o = 0; o < z.length; o += 4096) parts.push(chunk("IDAT", z.subarray(o, o + 4096)));
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), ...parts, chunk("IEND", Buffer.alloc(0))]);
  const pdf = (await letterPdf(letterBlocks("Sincerely,\n\n{signature}\n\n**Ms. A**"), { title: "T", signature: { buffer: png, x: 0, dy: -20, width: 150 } })).toString("latin1");
  // Every image object is complete: it has its dictionary (Subtype) and its data stream.
  const images = [...pdf.matchAll(/\/Subtype \/Image[\s\S]*?endobj/g)];
  assert.ok(images.length >= 2, "logo and signature");
  for (const m of images) assert.match(m[0], /stream/);
  assert.equal((pdf.match(/\/SMask/g) || []).length >= 2, true, "the signature keeps its transparency");
});
