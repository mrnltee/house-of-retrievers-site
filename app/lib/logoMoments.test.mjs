import test from "node:test";
import assert from "node:assert/strict";
import { logoMoments, logoTiming, momentSetFor, nextGap, pickMoment } from "./logoMoments.mjs";

test("light and dark modes each have their own moments for both dogs", () => {
  for (const scheme of ["light", "dark"]) {
    const dogs = new Set(momentSetFor(scheme).map((moment) => moment.dog));
    assert.ok(dogs.has("golden"), `${scheme} has a Golden moment`);
    assert.ok(dogs.has("lab"), `${scheme} has a Labrador moment`);
  }
  const lightIds = new Set(logoMoments.light.map((moment) => moment.id));
  assert.ok(logoMoments.dark.every((moment) => !lightIds.has(moment.id)));
});

test("unknown schemes fall back to the light set", () => {
  assert.equal(momentSetFor(undefined), logoMoments.light);
  assert.equal(momentSetFor("dark"), logoMoments.dark);
});

test("moment ids are unique and every moment has a usable duration", () => {
  const all = [...logoMoments.light, ...logoMoments.dark];
  assert.equal(new Set(all.map((moment) => moment.id)).size, all.length);
  for (const moment of all) {
    assert.ok(moment.duration >= 800 && moment.duration <= 4000, moment.id);
    assert.ok(moment.weight > 0, moment.id);
    assert.ok(moment.id.startsWith(`${moment.dog}-`), moment.id);
  }
});

test("pickMoment never repeats the previous moment", () => {
  const set = logoMoments.light;
  for (let i = 0; i < 200; i += 1) {
    const previous = set[i % set.length].id;
    assert.notEqual(pickMoment(set, previous, () => (i * 0.137) % 1).id, previous);
  }
});

test("pickMoment covers the whole set over many rolls", () => {
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) seen.add(pickMoment(logoMoments.dark, null, () => i / 100).id);
  assert.equal(seen.size, logoMoments.dark.length);
});

test("gaps stay inside the configured range", () => {
  assert.equal(nextGap(() => 0), logoTiming.minGap);
  assert.equal(nextGap(() => 0.999999), logoTiming.maxGap);
});
