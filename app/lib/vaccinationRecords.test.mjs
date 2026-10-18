import test from "node:test";
import assert from "node:assert/strict";
import { MAX_VACCINATION_PHOTOS, missingVaccinationCards, vaccinationBudget, vaccinationUploads } from "./vaccinationRecords.mjs";

test("vaccinationUploads: one optional photo per furbaby, by position; the old single field is furbaby 1", () => {
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: ["data:a", null, "data:c"] }, 2), [{ index: 0, dataUrl: "data:a" }]);
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: [null, "data:b"] }, 2), [{ index: 1, dataUrl: "data:b" }]);
  assert.deepEqual(vaccinationUploads({ vaccinationRecord: "data:x" }, 1), [{ index: 0, dataUrl: "data:x" }]);
  assert.deepEqual(vaccinationUploads({}, 3), []);
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: "nope" }, 3), []);
  assert.equal(vaccinationUploads({ vaccinationRecords: Array(20).fill("data:z") }, 20).length, MAX_VACCINATION_PHOTOS);
});

test("vaccinationBudget keeps all photos together under the request limit", () => {
  assert.equal(vaccinationBudget(1), 700_000);
  assert.ok(vaccinationBudget(8) * 8 * 1.37 < 4_000_000);
});

test("missingVaccinationCards: when required, every furbaby needs its own card", () => {
  assert.deepEqual(missingVaccinationCards([{ index: 0 }, { index: 2 }], 3), [1]);
  assert.deepEqual(missingVaccinationCards([], 0), []);
  assert.deepEqual(missingVaccinationCards([{ index: 0 }], 1), []);
});
