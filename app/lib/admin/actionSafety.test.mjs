import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : entry.name.endsWith(".jsx") ? [path] : [];
  });
}

test("every native admin submit button declares a confirmation path", () => {
  const adminApp = join(ROOT, "app", "admin", "(app)");
  const missing = [];
  for (const path of filesUnder(adminApp)) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/<button\b([^>]*)>/g)) {
      const attributes = match[1];
      if (/\btype=["']button["']/.test(attributes)) continue;
      if (/\bdata-confirm(?:ed-action)?=/.test(attributes)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      missing.push(`${relative(ROOT, path)}:${line}`);
    }
  }
  assert.deepEqual(missing, [], `Persisted admin actions must confirm first:\n${missing.join("\n")}`);
});

test("welcome photo and hand check-in actions authorize before reading a registration", () => {
  const source = readFileSync(join(ROOT, "app", "admin", "registrationActions.js"), "utf8");
  for (const name of ["uploadWelcomePhoto", "useProfileWelcomePhoto", "useInitialsWelcomePhoto", "manualCheckIn", "undoCheckIn"]) {
    const start = source.indexOf(`export async function ${name}`);
    assert.ok(start >= 0, `${name} exists`);
    const rest = source.slice(start + 1);
    const end = rest.indexOf("\nexport ");
    const body = end >= 0 ? rest.slice(0, end) : rest;
    assert.ok(body.includes("await actionAdmin(\"registrations:edit\")"), `${name} needs registrations:edit`);
    assert.ok(body.indexOf("await actionAdmin(") < body.indexOf("await registration("), `${name} must authorize before reading the registration`);
  }
});

test("registration payment actions authorize before reading a registration", () => {
  const source = readFileSync(join(ROOT, "app", "admin", "registrationActions.js"), "utf8");
  const names = ["approvePayment", "markPaid", "rejectPayment", "attachReceipt", "resendPass"];
  for (const [index, name] of names.entries()) {
    const start = source.indexOf(`export async function ${name}`);
    const next = index + 1 < names.length ? source.indexOf(`export async function ${names[index + 1]}`) : source.indexOf("export async function addRegistration");
    const body = source.slice(start, next);
    assert.ok(body.indexOf("await actionAdmin(") < body.indexOf("await registration("), `${name} must authorize before reading the registration`);
  }
});

test("journey entry actions authorize (media:edit) before touching the database", () => {
  const source = readFileSync(join(ROOT, "app", "admin", "journeyEntryActions.js"), "utf8");
  const names = [...source.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
  assert.ok(names.length >= 13, "all journey actions found");
  for (const name of names) {
    const start = source.indexOf(`export async function ${name}`);
    const rest = source.slice(start + 1);
    const end = rest.indexOf("\nexport ");
    const body = end >= 0 ? rest.slice(0, end) : rest;
    const auth = Math.min(...["actionAdmin(\"media:edit\")", "await allowed()"].map((s) => body.indexOf(s)).filter((i) => i >= 0));
    const firstQuery = body.search(/\b(sql|transaction)\(/);
    assert.ok(Number.isFinite(auth), `${name} checks permission`);
    assert.ok(firstQuery < 0 || auth < firstQuery, `${name} must authorize before its first query`);
  }
});

test("journey stops can't be published with undescribed photos, and the photo limit is checked under a lock", () => {
  const source = readFileSync(join(ROOT, "app", "admin", "journeyEntryActions.js"), "utf8");
  const publish = source.slice(source.indexOf("export async function setJourneyEntryStatus"), source.indexOf("export async function deleteJourneyEntry"));
  assert.match(publish, /status === "published"[\s\S]*COALESCE\(NULLIF\(trim\(p\.alt\)/, "publishing checks every photo has a description");
  for (const name of ["addJourneyPhoto", "borrowEventPhotos"]) {
    const start = source.indexOf(`export async function ${name}`);
    const body = source.slice(start, source.indexOf("\nexport ", start + 1));
    assert.match(body, /FOR UPDATE/, `${name} locks the stop before counting photos`);
  }
  const events = readFileSync(join(ROOT, "app", "admin", "actions.js"), "utf8");
  assert.match(events, /transaction\(async \(tx\) => \{\s*const rows = await tx\.sql\(\s*`UPDATE events SET[\s\S]*?UPDATE journey_entries SET happened_on/, "event and linked stop dates change in one transaction");
});
