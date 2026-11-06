import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IMAGES_PER_FURBABY, MAX_IMAGES_PER_RSVP, MAX_VACCINATION_PHOTOS, missingVaccinationCards, vaccinationBudget, vaccinationUploads } from "./vaccinationRecords.mjs";

test("vaccinationUploads: one optional photo per furbaby, by position; the old single field is furbaby 1", () => {
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: ["data:a", null, "data:c"] }, 2), [{ index: 0, page: 0, dataUrl: "data:a" }]);
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: [null, "data:b"] }, 2), [{ index: 1, page: 0, dataUrl: "data:b" }]);
  assert.deepEqual(vaccinationUploads({ vaccinationRecord: "data:x" }, 1), [{ index: 0, page: 0, dataUrl: "data:x" }]);
  assert.deepEqual(vaccinationUploads({}, 3), []);
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: "nope" }, 3), []);
  assert.equal(vaccinationUploads({ vaccinationRecords: Array(20).fill("data:z") }, 20).length, MAX_VACCINATION_PHOTOS);
});

test("vaccinationUploads: up to 5 photos per furbaby, pages in order, 20 per RSVP", () => {
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: [["data:a", "data:b"], null, ["data:c"]] }, 3), [
    { index: 0, page: 0, dataUrl: "data:a" }, { index: 0, page: 1, dataUrl: "data:b" }, { index: 2, page: 0, dataUrl: "data:c" },
  ]);
  assert.equal(vaccinationUploads({ vaccinationRecords: [Array(9).fill("data:z")] }, 1).length, MAX_IMAGES_PER_FURBABY);
  assert.equal(vaccinationUploads({ vaccinationRecords: Array(10).fill(Array(5).fill("data:z")) }, 10).length, MAX_IMAGES_PER_RSVP);
  assert.deepEqual(vaccinationUploads({ vaccinationRecords: [["", null, "data:k"]] }, 1), [{ index: 0, page: 0, dataUrl: "data:k" }]);
});

test("vaccinationBudget keeps all photos together under the request limit", () => {
  assert.equal(vaccinationBudget(1), 700_000);
  assert.ok(vaccinationBudget(8) * 8 * 1.37 < 4_000_000);
});

test("missingVaccinationCards: when required, every furbaby needs its own card", () => {
  assert.deepEqual(missingVaccinationCards([{ index: 0 }, { index: 2 }], 3), [1]);
  assert.deepEqual(missingVaccinationCards([{ index: 0 }, { index: 0 }, { index: 1 }], 2), []);
  assert.deepEqual(missingVaccinationCards([], 0), []);
  assert.deepEqual(missingVaccinationCards([{ index: 0 }], 1), []);
});
