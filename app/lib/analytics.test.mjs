import test from "node:test";
import assert from "node:assert/strict";
import { cleanEventValue, ctaEventParams, trackCta } from "./analytics.mjs";
import { activities } from "../content/activities.js";

test("event values are GA4-safe", () => {
  assert.equal(cleanEventValue("Mission Support!"), "mission_support");
  assert.equal(cleanEventValue(""), "");
  assert.equal(cleanEventValue("x".repeat(60)).length, 40);
});

test("cta params carry the name, section and extras", () => {
  assert.deepEqual(ctaEventParams("mission_support", "mission", { pillar: 3, empty: "" }), { cta_name: "mission_support", section: "mission", pillar: "3" });
  assert.equal(ctaEventParams("", "mission"), null);
});

test("trackCta does nothing without gtag", () => {
  assert.doesNotThrow(() => trackCta("mission_join", "mission"));
});

test("every pillar has a tracked action with a unique name", () => {
  const names = activities.flatMap((a) => [a.action, a.secondary].filter(Boolean)).map((a) => a.track);
  assert.equal(names.length, new Set(names).size);
  for (const a of activities) {
    assert.ok(a.action?.label && a.action.track, a.title);
    assert.ok(a.proof || a.steps, `${a.title} needs proof or steps`);
    for (const act of [a.action, a.secondary].filter(Boolean)) {
      assert.ok(act.kind === "support" || (act.kind === "join" && ["Member", "Volunteer", "Partner", "Sponsor"].includes(act.interest)), act.label);
    }
  }
});
