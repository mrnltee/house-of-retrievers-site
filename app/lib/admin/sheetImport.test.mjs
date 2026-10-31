import test from "node:test";
import assert from "node:assert/strict";
import { autoMatch, cellText, mapRows, rowInput } from "./sheetImport.mjs";

test("columns match by name, exact names first, each column once", () => {
  const m = autoMatch(["Company", "Contact Person", "Email Address", "Mobile", "Status", "Notes"], "supporters");
  assert.deepEqual(m, { name: 0, contactName: 1, contactEmail: 2, contactPhone: 3, status: 4, notes: 5 });
  const r = autoMatch(["Full Name", "E-mail", "Dog Name", "No. of Dogs", "Payment Status", "Ref"], "registrations");
  assert.equal(r.name, 0);
  assert.equal(r.email, 1);
  assert.equal(r.furbabyName, 2);
  assert.equal(r.payment, 4);
  assert.equal(r.reference, 5);
});

test("rows: header skipped, blank rows dropped, cells as text", () => {
  const rows = [["Name", "When"], ["Ana", new Date("2026-10-11T00:00:00Z")], ["", ""], ["Ben", 3.0]];
  assert.deepEqual(mapRows(rows, { name: 0, date: 1 }), [{ line: 2, fields: { name: "Ana", date: "2026-10-11" } }, { line: 4, fields: { name: "Ben", date: "3" } }]);
  assert.equal(cellText(true), "yes");
});

test("supporters: labels accepted, unknown values explained", () => {
  const ok = rowInput("supporters", { name: "Pawsome", status: "Confirmed", tier: "Gold", gives: "Cash, In-kind", cashAmount: "₱15,000" });
  assert.match(ok.error || "", /Tier "Gold"/);
  const good = rowInput("supporters", { name: "Pawsome", status: "confirmed", gives: "Cash, In-kind", cashAmount: "₱15,000" });
  assert.equal(good.input.kind, "Sponsor");
  assert.deepEqual(good.input.gives, ["cash", "in-kind"]);
  assert.equal(good.input.cashAmount, "15000");
  assert.match(rowInput("supporters", { name: "X", kind: "Donor" }).error, /Sponsor or Partner/);
});

test("registrations: ticket by name, payment words, yes/no", () => {
  const tickets = [{ label: "Early Bird", amount: 500 }, { label: "Regular", amount: 750 }];
  const r = rowInput("registrations", { name: "Ana", email: "a@x.ph", ticket: "regular", payment: "Paid", method: "Bank Transfer", photoConsent: "Yes" }, { tickets });
  assert.equal(r.input.ticket, "1");
  assert.equal(r.input.payment, "paid");
  assert.equal(r.input.method, "bank");
  assert.equal(r.input.photoConsent, "yes");
  assert.match(rowInput("registrations", { name: "A", email: "a@x.ph", ticket: "VIP" }, { tickets }).error, /isn't one of this event's/);
  assert.match(rowInput("registrations", { name: "A", email: "a@x.ph", payment: "maybe" }).error, /Paid, Pending/);
  assert.equal(rowInput("registrations", { name: "A", email: "a@x.ph" }).input.photoConsent, "no");
});

test("people: join type and status checked", () => {
  assert.equal(rowInput("people", { name: "Ana", email: "ANA@x.ph", kind: "volunteer" }).input.email, "ana@x.ph");
  assert.match(rowInput("people", { name: "Ana", email: "a@x.ph", kind: "Fan" }).error, /Join type/);
  assert.match(rowInput("people", { name: "Ana", email: "nope", kind: "Member" }).error, /email/);
});

test("Brand Tracker sheet: its columns match the sponsor record", () => {
  const heads = ["Brand Name", "Contact Person", "Email Address", "Contact Number", "IG / Website", "Participation Type", "Booth Requested?", "Booth Fee / Donation (PHP)",
    "Item Donation Details", "Quantity of Items", "Cash / In-kind Value (PHP)", "Booth Requirements", "Representatives Attending", "Dogs Attending", "Invitation Status",
    "RSVP Status", "Invitation Date", "Follow-up Date", "Agreement Status", "Assigned Team Member", "Notes", "Guest Classification"];
  const m = autoMatch(heads, "supporters");
  const at = (key) => heads[m[key]];
  assert.equal(at("name"), "Brand Name");
  assert.equal(at("contactName"), "Contact Person");
  assert.equal(at("contactPhone"), "Contact Number");
  assert.equal(at("link"), "IG / Website");
  assert.equal(at("cashAmount"), "Booth Fee / Donation (PHP)");
  assert.equal(at("inKindValue"), "Cash / In-kind Value (PHP)");
  assert.equal(at("repsAttending"), "Representatives Attending");
  assert.equal(at("followUpOn"), "Follow-up Date");
  assert.ok(!Object.values(m).includes(heads.indexOf("Guest Classification")), "guest classification belongs to the Guest list");
});

test("Brand Tracker rows: messy cells are sorted, not rejected", () => {
  const { input } = rowInput("supporters", {
    name: "Boop", contactEmail: "a@boop.ph , b@boop.ph", contactPhone: "9063151918", link: "asking for proposal",
    participation: "Cash Donation", booth: "Yes", inKindValue: "5,000", inKindNote: "Treats", itemQty: "20",
    inviteStatus: "Follow-up Needed", rsvpStatus: "No Response", agreementStatus: "Not Started", followUpOn: "11/5/2026", notes: "Call first",
  });
  assert.equal(input.contactEmail, "a@boop.ph");
  assert.equal(input.contactPhone, "09063151918");
  assert.deepEqual(input.gives, ["cash", "booth"]);
  assert.equal(input.cashAmount, "5000");
  assert.equal(input.inKindValue, "");
  assert.equal(input.inKindNote, "Treats ×20");
  assert.equal(input.inviteStatus, "follow_up");
  assert.equal(input.rsvpStatus, "no_response");
  assert.equal(input.followUpOn, "2026-11-05");
  assert.equal(input.notes, "Call first\nIG / Website: asking for proposal\nOther emails: b@boop.ph");
  assert.equal(rowInput("supporters", { name: "X", contactEmail: "declined" }).input.notes, "Email column: declined");
  assert.equal(rowInput("supporters", { name: "X", link: "@boopph" }).input.instagram, "@boopph");
  assert.equal(rowInput("supporters", { name: "X", link: "`" }).input.website, "");
  assert.match(rowInput("supporters", { name: "X", rsvpStatus: "Maybe" }).error, /RSVP status/);
  assert.match(rowInput("supporters", { name: "X", participation: "Raffle" }).error, /Participation type/);
});
