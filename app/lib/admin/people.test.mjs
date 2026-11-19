import test from "node:test";
import assert from "node:assert/strict";
import { memberNumber } from "./people.mjs";

test("member numbers read HOR-YY-NNNN", () => {
  assert.equal(memberNumber({ member_no: 1, member_year: 2026 }), "HOR-26-0001");
  assert.equal(memberNumber({ member_no: 128, member_year: 2027 }), "HOR-27-0128");
  assert.equal(memberNumber({ member_no: 3, member_year: 2105 }), "HOR-05-0003");
  assert.equal(memberNumber({ member_no: null, member_year: null }), "");
  assert.equal(memberNumber(null), "");
  assert.equal(memberNumber({ kind: "Volunteer", member_no: 12, member_year: 2026 }), "HORV-26-0012");
  assert.equal(memberNumber({ kind: "Member", member_no: 12, member_year: 2026 }), "HOR-26-0012");
});

test("peopleMatch: the best People record for a registrant's email", async () => {
  const { peopleMatch } = await import("./people.mjs");
  assert.equal(peopleMatch([]), null);
  const member = { id: "1", kind: "Member", membership: "active", member_no: 12, member_year: 2026 };
  const partner = { id: "2", kind: "Partner" };
  const m = peopleMatch([partner, member]);
  assert.equal(m.person.id, "1");
  assert.equal(m.label, "Member · HOR-26-0012");
  assert.equal(m.tone, "ok");
  assert.deepEqual(m.others, ["Partner"]);
  assert.equal(peopleMatch([{ id: "3", kind: "Member", membership: "applicant" }]).label, "Member applicant");
  assert.equal(peopleMatch([{ id: "4", kind: "Volunteer", membership: "left" }]).label, "Former volunteer");
  assert.equal(peopleMatch([{ id: "5", kind: "Volunteer", membership: "active", member_no: 3, member_year: 2026 }]).label, "Volunteer · HORV-26-0003");
  assert.equal(peopleMatch([partner]).label, "Partner");
});
