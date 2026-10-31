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
