import test from "node:test";
import assert from "node:assert/strict";
import { cleanCompType, compFromTicket, compLine, compTicket, compValue } from "./compTickets.mjs";
import { capacityUnits, validateCapacityCounts } from "./eventCapacity.mjs";

test("complimentary ticket values", () => {
  assert.equal(compFromTicket("comp:vip"), "vip");
  assert.equal(compFromTicket(compValue("organizer")), "organizer");
  assert.equal(compFromTicket("comp:king"), null);
  assert.equal(compFromTicket("0"), null);
  assert.equal(compFromTicket(""), null);
  assert.equal(cleanCompType("guest"), "guest");
  assert.deepEqual(compTicket("vip"), { label: "VIP", amount: 0 });
  assert.equal(compLine("guest"), "Guest · Complimentary");
  assert.equal(compLine(null), "");
});

test("complimentary registrations use no capacity", () => {
  assert.equal(capacityUnits("human", { humans: 3, furbabies: 1, comp: true }), 0);
  assert.equal(capacityUnits("human", { humans: 3, furbabies: 1 }), 3);
  assert.deepEqual(validateCapacityCounts("furbaby", 2, 0, { comp: true }), { units: 0 });
});
