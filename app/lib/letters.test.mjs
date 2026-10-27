import test from "node:test";
import assert from "node:assert/strict";
import { LETTER_STARTERS, blanksOf, fillLetter, letterBlocks, letterDate, letterWithOverride, missingBlanks, prepareLetter, recipientName } from "./letters.mjs";
import { letterPdf, pdfSafe } from "./letterPdf.mjs";

test("the eight starter letters are there, each with a subject", () => {
  assert.equal(LETTER_STARTERS.length, 8);
  assert.equal(new Set(LETTER_STARTERS.map((l) => l.key)).size, 8);
  for (const l of LETTER_STARTERS) {
    assert.ok(l.subject, l.key);
    // The guests-of-honor letter is written to Senator Zubiri by name.
    assert.match(l.cover, l.key === "invite-guests-of-honor" ? /^Dear Senator Zubiri,/ : /\[Company Name\]/, l.key);
  }
});

test("covering emails (owner's brief, 2026-10-27): portfolio link, official name, no \"beyond\"", () => {
  const portfolio = "[Partnership Portfolio](https://www.canva.com/design/DAHWLsiZugc/7RGzvgYEMCjGc67tzRlW2w/view)";
  for (const l of LETTER_STARTERS) {
    assert.ok(l.cover.includes(portfolio), `${l.key}: portfolio link`);
    assert.match(l.cover, /The House of Retrievers Society Inc/, l.key);
    assert.doesNotMatch(`${l.subject} ${l.cover}`, /beyond/i, l.key);
    assert.match(l.cover, /attached/i, `${l.key}: mentions the attachment`);
    assert.ok(l.cover.length <= 2000, l.key);
  }
  assert.equal(new Set(LETTER_STARTERS.map((l) => l.cover)).size, 8, "each cover is its own");
  assert.deepEqual(blanksOf(`See our ${portfolio}.`).map((b) => b.label), []);
});

test("blanks: automatic ones are not asked for; optional and suggested ones are marked", () => {
  const blanks = blanksOf("Hi [Company Name] [Date]", "[Address?]\n[Reply Date] and [Reply Date]", "[Proposed: Non-exclusive.]");
  assert.deepEqual(blanks.map((b) => b.label), ["Address", "Reply Date", "Proposed: Non-exclusive."]);
  assert.equal(blanks[0].optional, true);
  assert.equal(blanks[2].suggestion, "Non-exclusive.");
  assert.deepEqual(missingBlanks(blanks, { "Proposed: Non-exclusive.": "x" }), ["Reply Date"]);
});

test("filling: the company name everywhere, the date, and an empty optional line disappears", () => {
  const text = "[Date]\n[Company Name]\n[Address?]\n\nDear [Company Name]:\n\nReply by [Reply Date].";
  const out = fillLetter(text, { name: "Bark Boulevard PH", date: "October 24, 2026", values: { "Reply Date": "Nov 6" } });
  assert.equal(out, "October 24, 2026\nBark Boulevard PH\n\nDear Bark Boulevard PH:\n\nReply by Nov 6.");
  assert.match(fillLetter("[Address?]", { values: { Address: "Pasay" } }), /^Pasay$/);
});

test("the recipient is always the company; for people, their organization, else their name", () => {
  assert.equal(recipientName({ supporter: { name: "GRWM Cosmetics" } }), "GRWM Cosmetics");
  assert.equal(recipientName({ person: { name: "Ana Cruz", organization: "Paws Inc." } }), "Paws Inc.");
  assert.equal(recipientName({ person: { name: "Ana Cruz", organization: "" } }), "Ana Cruz");
});

test("markup: headings, centred lines, bullets, bold, tables and page breaks", () => {
  const blocks = letterBlocks("# TITLE\n\n## Part\n\n^ centred\n\n- **One.** first\n- two\n\n|! A | B |\n| x // y | **z** |\n\n---page---\n\nplain");
  assert.deepEqual(blocks.map((b) => b.type), ["h1", "h2", "center", "bullet", "bullet", "table", "page", "p"]);
  assert.deepEqual(blocks[3].runs, [{ text: "One.", bold: true }, { text: " first", bold: false }]);
  const [head, row] = blocks[5].rows;
  assert.equal(head.header, true);
  assert.equal(row.cells[0][0].text, "x\ny");
  assert.equal(row.cells[1][0].bold, true);
});

test("tables are capped at 12 columns (the rest folds into the last cell) and 400 rows", () => {
  const wide = `| ${Array.from({ length: 30 }, (_, i) => `c${i}`).join(" | ")} |`;
  const [table] = letterBlocks(wide);
  assert.equal(table.rows[0].cells.length, 12);
  assert.match(table.rows[0].cells[11][0].text, /^c11 \/ c12 \/ .* c29$/);
  const tall = Array.from({ length: 500 }, () => "| a | b |").join("\n");
  assert.equal(letterBlocks(tall)[0].rows.length, 400);
});

test("a saved wording replaces the starter, field by field", () => {
  const l = letterWithOverride("invite-media", { name: "Media invite", subject: "", cover: "Hello [Company Name]", body: "Body" });
  assert.equal(l.name, "Media invite");
  assert.equal(l.cover, "Hello [Company Name]");
  assert.ok(l.subject.length > 0);
  assert.equal(letterWithOverride("nope", null), null);
});

test("every starter fills in and renders to a PDF", async () => {
  for (const letter of LETTER_STARTERS) {
    const blanks = blanksOf(letter.subject, letter.cover, letter.body);
    const values = Object.fromEntries(blanks.map((b) => [b.label, b.suggestion || "Sample"]));
    const p = prepareLetter(letter, { name: "Bark Boulevard PH", date: letterDate(new Date("2026-10-24T03:00:00Z")), values });
    assert.doesNotMatch(p.cover, /\[[^\]]+\](?!\(https:)/, `${letter.key}: cover still has a blank`);
    assert.match(p.cover, letter.key === "invite-guests-of-honor" ? /^Dear Senator Zubiri,/ : /^Dear Bark Boulevard PH,/);
    const pdf = await letterPdf(p.blocks, { title: p.subject });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", letter.key);
  }
});

test("PDF text: peso sign and check boxes the standard fonts lack", () => {
  assert.equal(pdfSafe("₱100,000 ☐ Gold"), "PHP 100,000 [  ] Gold");
  assert.equal(pdfSafe("“Quotes” — ok"), "“Quotes” — ok");
  assert.equal(pdfSafe("emoji 🐶 gone"), "emoji  gone");
});

test("a short letter is one PDF page (no blank page from the footer)", async () => {
  const buf = await letterPdf([{ type: "p", runs: [{ text: "Hello. ".repeat(40) }] }]);
  assert.equal((buf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
});

test("a few spilled lines don't make a near-empty extra page (letters tighten a step instead)", async () => {
  for (const key of ["invite-media", "invite-guest-speaker", "invite-creators"]) {
    const letter = LETTER_STARTERS.find((l) => l.key === key);
    const values = Object.fromEntries(blanksOf(letter.subject, letter.cover, letter.body).map((b) => [b.label, b.suggestion || `Sample ${b.label}`]));
    const pdf = await letterPdf(prepareLetter(letter, { name: "House of Retrievers Test", values }).blocks);
    assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1, key);
  }
});

test("a covering email's [label](https://…) is a real link in the email and spelled out in plain text", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const mail = letterCoverEmail({ subject: "Hi", cover: "Dear Bark,\n\nSee our [Partnership Portfolio](https://www.canva.com/design/x/view).", filename: "a.pdf" });
  assert.match(mail.html, /<a class="em-text-link" href="https:\/\/www\.canva\.com\/design\/x\/view"[^>]*>Partnership Portfolio<\/a>/);
  assert.match(mail.text, /Partnership Portfolio \(https:\/\/www\.canva\.com\/design\/x\/view\)/);
  const unsafe = letterCoverEmail({ subject: "Hi", cover: "[x](javascript:alert(1))", filename: "a.pdf" });
  assert.doesNotMatch(unsafe.html, /href="javascript/);
});

test("a name or value can't smuggle a link into a covering email", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const letter = { name: "X", subject: "Hi", cover: "Dear [Company Name],\n\nNote: [Note]\n\nSee our [Partnership Portfolio](https://www.canva.com/design/x/view).", body: "B" };
  const p = prepareLetter(letter, { name: "[Click here](https://evil.example)", values: { Note: "[win](https://evil.example)" } });
  const mail = letterCoverEmail({ subject: p.subject, cover: p.cover, filename: p.filename });
  assert.doesNotMatch(mail.html, /href="https:\/\/evil/);
  assert.match(mail.html, /href="https:\/\/www\.canva\.com\/design\/x\/view"/);
});
