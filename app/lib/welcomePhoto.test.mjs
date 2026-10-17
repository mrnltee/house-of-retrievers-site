import test from "node:test";
import assert from "node:assert/strict";
import { canSeeWelcomePhoto, initialsFor, pickPeopleMatch, pickWelcomePhoto, welcomeMessageLine } from "./welcomePhoto.mjs";

const person = (id, kind, name, photo = null, email = "ana@x.test") => ({ id, kind, name, email, photo_id: photo });

test("initials", () => {
  assert.equal(initialsFor("Ana Reyes"), "AR");
  assert.equal(initialsFor("  maria  de la cruz "), "MC");
  assert.equal(initialsFor("Cher"), "C");
  assert.equal(initialsFor(""), "?");
  assert.equal(initialsFor("Ñora Ünal"), "ÑÜ");
});

test("name match ignores case and spacing", () => {
  const ana = person("p1", "Member", "Ana Reyes", "ph1");
  assert.equal(pickPeopleMatch({ name: "  ana   REYES ", email: "ANA@x.test" }, [ana]), ana);
});

test("email-only match needs exactly one record", () => {
  const ana = person("p1", "Member", "Ana Reyes", "ph1");
  const ben = person("p2", "Volunteer", "Ben Reyes", "ph2");
  assert.equal(pickPeopleMatch({ name: "A. Reyes", email: "ana@x.test" }, [ana]), ana);
  assert.equal(pickPeopleMatch({ name: "A. Reyes", email: "ana@x.test" }, [ana, ben]), null);
  assert.equal(pickPeopleMatch({ name: "Ana Reyes", email: "other@x.test" }, [ana]), null);
});

test("shared email at this event blocks the email-only match", () => {
  const ana = person("p1", "Member", "Ana Reyes", "ph1");
  assert.equal(pickPeopleMatch({ name: "Ben Reyes", email: "ana@x.test" }, [ana], { sharedEmail: true }), null);
  assert.equal(pickPeopleMatch({ name: "Ana Reyes", email: "ana@x.test" }, [ana], { sharedEmail: true }), ana);
});

test("match preference: a photo first, then Member, then Volunteer", () => {
  const memberNoPhoto = person("p1", "Member", "Ana Reyes");
  const volunteerPhoto = person("p2", "Volunteer", "Ana Reyes", "ph2");
  const memberPhoto = person("p3", "Member", "Ana Reyes", "ph3");
  const partnerPhoto = person("p4", "Partner", "Ana Reyes", "ph4");
  const rsvp = { name: "Ana Reyes", email: "ana@x.test" };
  assert.equal(pickPeopleMatch(rsvp, [memberNoPhoto, volunteerPhoto]), volunteerPhoto);
  assert.equal(pickPeopleMatch(rsvp, [volunteerPhoto, memberPhoto]), memberPhoto);
  assert.equal(pickPeopleMatch(rsvp, [partnerPhoto, volunteerPhoto]), volunteerPhoto);
});

test("own choice without a photo falls back", () => {
  assert.deepEqual(pickWelcomePhoto({ choice: "own", ownPhotoId: null, match: { photo_id: "p1" } }), { source: "people", photoId: "p1" });
  assert.deepEqual(pickWelcomePhoto({ choice: "own", ownPhotoId: null, match: null }), { source: "initials", photoId: null });
  assert.deepEqual(pickWelcomePhoto({ choice: "own", ownPhotoId: "r1", match: { photo_id: "p1" } }), { source: "own", photoId: "r1" });
  assert.deepEqual(pickWelcomePhoto({ choice: "initials", ownPhotoId: "r1", match: { photo_id: "p1" } }), { source: "initials", photoId: null });
  assert.deepEqual(pickWelcomePhoto({ choice: null, ownPhotoId: null, match: { photo_id: null } }), { source: "initials", photoId: null });
});

test("message line: unset uses the default, empty shows nothing", () => {
  assert.equal(welcomeMessageLine(null), "Welcome in. Have a wonderful time together.");
  assert.equal(welcomeMessageLine(undefined), "Welcome in. Have a wonderful time together.");
  assert.equal(welcomeMessageLine(""), "");
  assert.equal(welcomeMessageLine("   "), "");
  assert.equal(welcomeMessageLine("  Hi  "), "Hi");
});

test("who may see welcome photos", () => {
  assert.equal(canSeeWelcomePhoto(["checkin"]), true);
  assert.equal(canSeeWelcomePhoto(["treasurer"]), true);
  assert.equal(canSeeWelcomePhoto(["content"]), false);
  assert.equal(canSeeWelcomePhoto([]), false);
});
