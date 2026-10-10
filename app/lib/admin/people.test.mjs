import test from "node:test";
import assert from "node:assert/strict";
import { memberNumber } from "./people.mjs";

test("member numbers read HOR-YY-NNNN", () => {
  assert.equal(memberNumber({ member_no: 1, member_year: 2026 }), "HOR-26-0001");
  assert.equal(memberNumber({ member_no: 128, member_year: 2027 }), "HOR-27-0128");
  assert.equal(memberNumber({ member_no: 3, member_year: 2105 }), "HOR-05-0003");
  assert.equal(memberNumber({ member_no: null, member_year: null }), "");
  assert.equal(memberNumber(null), "");
});
