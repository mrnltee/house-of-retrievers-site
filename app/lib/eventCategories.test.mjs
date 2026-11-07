import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES } from "./admin/events.mjs";
import { ACTIVITY_CATEGORIES, isActivityCategory, participantsLabel, showsGuestList } from "./eventCategories.mjs";

test("every activity category is one the editor offers", () => {
  for (const c of ACTIVITY_CATEGORIES) assert.ok(CATEGORIES.includes(c), c);
  assert.ok(CATEGORIES.includes("Wellness"));
});

test("activities have Participants and no guest list; fundraisers and outreach keep theirs", () => {
  for (const c of ["Socials & runs", "Workshops", "Wellness"]) {
    assert.equal(isActivityCategory(c), true);
    assert.equal(showsGuestList(c), false);
    assert.equal(participantsLabel(c), "Participants");
  }
  for (const c of ["Fundraisers", "Community outreach", "", null]) {
    assert.equal(showsGuestList(c), true);
    assert.equal(participantsLabel(c), "RSVPs");
  }
});
