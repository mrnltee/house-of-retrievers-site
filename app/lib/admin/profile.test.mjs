import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanProfile, displayName, initialsOf, roleLine } from "./profile.mjs";

test("names show as the full name, or first name / furbaby", () => {
  const shey = { name: "Shey Santos", furbaby_name: "Macchiato", email: "shey@x.ph" };
  assert.equal(displayName(shey), "Shey Santos");
  assert.equal(displayName({ ...shey, show_as: "first" }), "Shey / Macchiato");
  assert.equal(displayName({ ...shey, show_as: "first", furbaby_name: "" }), "Shey");
  assert.equal(displayName({ ...shey, show_as: "first", first_name: "Sheila" }), "Sheila / Macchiato");
  assert.equal(displayName({ email: "owner@example.test" }), "owner");
});

test("initials stand in for a photo", () => {
  assert.equal(initialsOf({ name: "Shey Santos" }), "SS");
  assert.equal(initialsOf({ name: "Shey" }), "SH");
  assert.equal(initialsOf({ email: "mbt.usoy@x.ph" }), "MU");
});

test("the role line under the name", () => {
  assert.equal(roleLine({ roles: ["owner"] }), "Owner");
  assert.equal(roleLine({ roles: ["events"], pages: ["events"] }), "Admin");
  assert.equal(roleLine({ roles: ["events", "treasurer"] }), "Events lead, Treasurer");
});

test("the profile form needs a full name; first name defaults from it", () => {
  assert.match(cleanProfile({}).error, /full name/);
  assert.deepEqual(cleanProfile({ name: " Shey  Santos ", furbabyName: "Macchiato", showAs: "first" }).profile, { name: "Shey Santos", firstName: "Shey", furbabyName: "Macchiato", showAs: "first" });
});
