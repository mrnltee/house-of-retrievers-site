import test from "node:test";
import assert from "node:assert/strict";
import { BRAND_GUIDES, GUIDES, SCENE_TARGETS, stepDuration } from "./howToGuides.mjs";

test("every brand guide exists, has steps, and points only at things its mock draws", () => {
  for (const key of BRAND_GUIDES) {
    const guide = GUIDES[key];
    assert.ok(guide, `${key} is defined`);
    assert.ok(guide.title && guide.steps.length >= 3, `${key} has a title and steps`);
    guide.steps.forEach((s, i) => {
      assert.ok(SCENE_TARGETS[s.scene], `${key} step ${i + 1}: known scene ${s.scene}`);
      assert.ok(SCENE_TARGETS[s.scene].includes(s.target), `${key} step ${i + 1}: ${s.target} is on ${s.scene}`);
      assert.ok(s.caption.length > 10, `${key} step ${i + 1} has a caption`);
      if (s.act === "type") assert.ok(s.text, `${key} step ${i + 1}: typing needs text`);
      assert.ok(!s.act || ["click", "tick", "type"].includes(s.act), `${key} step ${i + 1}: known action`);
    });
  }
});

test("steps stay up long enough to read, and not forever", () => {
  assert.equal(stepDuration({ caption: "Short." }), 2800);
  const long = stepDuration({ caption: "word ".repeat(40) });
  assert.ok(long > 2800 && long <= 7000);
  const caption = "Search the brand directory by name and tick the ones you want.";
  assert.ok(stepDuration({ caption, act: "type", text: "Pawsome Treats" }) > stepDuration({ caption }), "typing adds time");
});
