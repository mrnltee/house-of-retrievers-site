import test from "node:test";
import assert from "node:assert/strict";
import { allRequiredVerified, cleanVaccineKey, cleanVaccines, missingVaccines, missingVaccinesMessage, vaccineLabel, vaccineStatus, vaccineSummary } from "./vaccineTypes.mjs";

test("cleanVaccines keeps known vaccines once, in the built-in order", () => {
  assert.deepEqual(cleanVaccines([{ key: "kennel-cough" }, "rabies", { key: "rabies", required: true }, { key: "parvo" }, { key: "5in1", required: 1 }]), [
    { key: "5in1", required: true },
    { key: "rabies", required: false },
    { key: "kennel-cough", required: false },
  ]);
  assert.deepEqual(cleanVaccines(null), []);
  assert.deepEqual(cleanVaccines("rabies"), []);
});

test("cleanVaccineKey allows the vaccines and other, else null", () => {
  assert.equal(cleanVaccineKey("rabies"), "rabies");
  assert.equal(cleanVaccineKey("other"), "other");
  assert.equal(cleanVaccineKey("covid"), null);
  assert.equal(cleanVaccineKey(undefined), null);
  assert.equal(vaccineLabel(null), "Vaccination card");
  assert.equal(vaccineLabel("other"), "Other page");
});

test("missingVaccines lists required vaccines with no photo, per furbaby", () => {
  const vaccines = [{ key: "5in1", required: true }, { key: "rabies", required: true }, { key: "kennel-cough" }];
  const uploads = [{ index: 0, vaccine: "5in1" }, { index: 0, vaccine: "rabies" }, { index: 1, vaccine: "rabies" }, { index: 1, vaccine: null }];
  const missing = missingVaccines(uploads, 2, vaccines);
  assert.deepEqual(missing, [{ index: 1, keys: ["5in1"] }]);
  assert.match(missingVaccinesMessage(missing, 2), /furbaby 2: 5-in-1 \(DHPPiL\)/);
  assert.deepEqual(missingVaccines([], 0, vaccines), []);
  assert.deepEqual(missingVaccines([], 2, [{ key: "rabies" }]), []);
});

test("vaccineStatus: missing, uploaded, verified (a check without a photo still counts)", () => {
  const vaccines = [{ key: "5in1", required: true }, { key: "rabies", required: true }, { key: "kennel-cough" }];
  const records = [{ index: 0, vaccine: "5in1" }, { index: 0, vaccine: "rabies" }];
  const checks = [{ index: 0, vaccine: "5in1" }, { index: 0, vaccine: "kennel-cough" }];
  assert.deepEqual(vaccineStatus(records, checks, 0, vaccines).map((s) => s.state), ["verified", "uploaded", "verified"]);
  assert.equal(allRequiredVerified(records, checks, 1, vaccines), false);
  assert.equal(allRequiredVerified(records, [...checks, { index: 0, vaccine: "rabies" }], 1, vaccines), true);
});

test("vaccineSummary takes the weakest state across furbabies", () => {
  const vaccines = [{ key: "5in1", required: true }, { key: "rabies" }];
  const records = [{ index: 0, vaccine: "5in1" }, { index: 1, vaccine: "5in1" }, { index: 0, vaccine: "rabies" }];
  const checks = [{ index: 0, vaccine: "5in1" }, { index: 1, vaccine: "5in1" }, { index: 0, vaccine: "rabies" }];
  assert.deepEqual(vaccineSummary(records, checks, 2, vaccines).map((s) => [s.key, s.state]), [["5in1", "verified"], ["rabies", "missing"]]);
  assert.deepEqual(vaccineSummary(records, [], 2, vaccines).map((s) => s.state), ["uploaded", "missing"]);
  assert.deepEqual(vaccineSummary(records, checks, 0, vaccines), []);
});
