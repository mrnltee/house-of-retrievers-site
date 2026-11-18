import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketKeys, ticketGroups } from "./regTicketFilter.mjs";

test("a registration's ticket keys: complimentary with its type, else the ticket name", () => {
  assert.deepEqual(ticketKeys({ comp_type: "vip", ticket_label: "VIP" }), ["comp", "comp:vip"]);
  assert.deepEqual(ticketKeys({ ticket_label: "Early Bird" }), ["t:early-bird"]);
  assert.deepEqual(ticketKeys({ ticket_label: "  Early   bird " }), ["t:early-bird"]);
  assert.deepEqual(ticketKeys({ ticket_label: "" }), ["none"]);
});

test("ticket groups: complimentary and its types, then each ticket, then no ticket, with counts", () => {
  const rows = [
    { comp_type: "vip", ticket_label: "VIP" }, { comp_type: "guest", ticket_label: "Guest" }, { comp_type: "vip", ticket_label: "VIP" },
    { ticket_label: "Early Bird" }, { ticket_label: "Regular" }, { ticket_label: "Early bird" }, { ticket_label: null },
  ];
  assert.deepEqual(ticketGroups(rows), [
    ["comp", "Complimentary", 3],
    ["comp:guest", "Complimentary · Guest", 1],
    ["comp:vip", "Complimentary · VIP", 2],
    ["t:early-bird", "Early Bird", 2],
    ["t:regular", "Regular", 1],
    ["none", "No ticket (waitlist)", 1],
  ]);
});

test("one complimentary type only: no sub-line repeating the total", () => {
  assert.deepEqual(ticketGroups([{ comp_type: "vip" }, { ticket_label: "Regular" }]), [["comp", "Complimentary · VIP", 1], ["t:regular", "Regular", 1]]);
});
