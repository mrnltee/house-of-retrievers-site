import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("the privacy notice is linked wherever visitors share personal information", () => {
  assert.equal(existsSync(`${root}app/privacy/page.jsx`), true);
  assert.match(read("app/components/JoinModal.jsx"), /PRIVACY_URL/);
  assert.match(read("app/components/RsvpModal.jsx"), /PRIVACY_URL/);
  assert.match(read("app/components/PayStep.jsx"), /PRIVACY_URL/);
  assert.match(read("app/components/FooterLegal.jsx"), /PRIVACY_URL/);
});
